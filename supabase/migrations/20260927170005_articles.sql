-- Baseline 5/7 — articles and their tags.
--
-- Publishing rules (shared with `src/domain/publishing.ts`):
-- * `published` articles are public; `scheduled` ones become public once
--   `scheduled_at` has passed — no background job needed.
-- * `published_at` records when an article first went live and never moves.
-- * At most one article is highlighted (shown prominently on the homepage);
--   highlighting another one moves the highlight.
--
-- Languages: every article has a `language` (the blog's main language is set
-- in the app's site config). Translations of the same piece share a
-- `translation_group_id`; each translation has its own slug, SEO and status.

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.members(user_id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  slug text not null check (private.is_normalized_slug(slug)),
  language text not null check (language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  translation_group_id uuid not null default gen_random_uuid(),
  excerpt text check (excerpt is null or char_length(excerpt) <= 500),
  content_version integer not null default 1 check (content_version > 0),
  content_blocks jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
  cover_image_id uuid references public.media_assets(id) on delete set null,
  cover_image_alt text check (cover_image_alt is null or char_length(cover_image_alt) <= 500),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'scheduled', 'published', 'archived')),
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  is_highlighted boolean not null default false,
  scheduled_at timestamptz,
  published_at timestamptz,
  -- When the article went (or goes) live; orders public lists.
  public_at timestamptz generated always as (coalesce(published_at, scheduled_at)) stored,
  seo_title text check (seo_title is null or char_length(seo_title) <= 60),
  seo_description text check (seo_description is null or char_length(seo_description) <= 160),
  social_image_id uuid references public.media_assets(id) on delete set null,
  reading_time_minutes integer check (reading_time_minutes is null or reading_time_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Slugs are unique per language (/arthro/x and /en/article/x may coexist).
  unique (language, slug),
  -- One version per language in a translation group.
  unique (translation_group_id, language),
  check (jsonb_typeof(content_blocks) = 'object'),
  check (jsonb_typeof(content_blocks -> 'version') = 'number'),
  check ((content_blocks ->> 'version')::integer = content_version),
  check (jsonb_typeof(content_blocks -> 'blocks') = 'array'),
  check (status <> 'scheduled' or scheduled_at is not null),
  check (status <> 'published' or published_at is not null),
  check (not is_highlighted or status = 'published'),
  check (status <> 'published' or cover_image_id is null or nullif(trim(cover_image_alt), '') is not null)
);

alter table public.articles enable row level security;

create unique index articles_one_highlight_idx
on public.articles (is_highlighted)
where is_highlighted;

create index articles_language_status_public_at_idx
on public.articles (language, status, public_at desc);
create index articles_author_status_idx on public.articles (author_id, status);
create index articles_category_status_idx on public.articles (category_id, status);
create index articles_featured_public_at_idx on public.articles (public_at desc) where is_featured;
create index articles_trending_public_at_idx on public.articles (public_at desc) where is_trending;

create or replace function private.prepare_article_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only a new or changed author must be active; editors can still edit the
  -- articles of a member who was later suspended.
  if new.author_id is not null
    and (tg_op = 'INSERT' or new.author_id is distinct from old.author_id)
    and not exists (
      select 1
      from public.members
      where user_id = new.author_id
        and status = 'active'
    ) then
    raise exception 'Article author must be an active member';
  end if;

  if tg_op = 'INSERT' then
    new.published_at = case when new.status = 'published' then now() else null end;
  elsif old.published_at is not null then
    new.published_at = old.published_at;
  elsif new.status = 'published' then
    -- A due scheduled article keeps the moment it actually went live.
    new.published_at = case
      when old.status = 'scheduled' and old.scheduled_at <= now() then old.scheduled_at
      else now()
    end;
  else
    new.published_at = null;
  end if;

  -- Highlighting an article moves the highlight from any other article.
  if new.is_highlighted and (tg_op = 'INSERT' or not old.is_highlighted) then
    update public.articles
    set is_highlighted = false
    where is_highlighted
      and id <> new.id;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.prepare_article_write() from public;

create trigger articles_prepare_write
before insert or update on public.articles
for each row execute function private.prepare_article_write();

-- Editors edit everything; authors only their own drafts and articles in review.
create or replace function private.can_edit_article(target_article_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.has_role(array['owner', 'admin', 'editor']))
    or exists (
      select 1
      from public.articles
      where id = target_article_id
        and author_id = (select auth.uid())
        and status in ('draft', 'in_review')
    );
$$;

revoke all on function private.can_edit_article(uuid) from public;
grant execute on function private.can_edit_article(uuid) to authenticated;

create table public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

alter table public.article_tags enable row level security;

create index article_tags_tag_article_idx on public.article_tags (tag_id, article_id);

-- Replaces an article's tags in one transaction. Runs with the caller's
-- rights, so RLS decides who may edit the article and who may create tags
-- (editors and above; an author adding a new tag gets error 42501).
-- `p_tags` is `[{ "slug": "...", "name": "..." }]`; slugs come from the
-- application's slugify, which handles Greek. An existing tag matches on
-- slug or on name (case-insensitive), so no tag is silently dropped.
create or replace function public.set_article_tags(p_article_id uuid, p_tags jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  wanted_tag_ids uuid[];
begin
  if jsonb_typeof(p_tags) <> 'array' then
    raise exception 'p_tags must be a JSON array';
  end if;

  if not (select private.can_edit_article(p_article_id)) then
    raise exception 'Not allowed to edit this article' using errcode = '42501';
  end if;

  insert into public.tags (slug, name)
  select distinct on (t.slug) t.slug, trim(t.name)
  from jsonb_to_recordset(p_tags) as t(slug text, name text)
  where not exists (
    select 1
    from public.tags existing
    where existing.slug = t.slug
      or lower(existing.name) = lower(trim(t.name))
  )
  on conflict do nothing;

  select coalesce(array_agg(distinct tags.id), '{}')
  into wanted_tag_ids
  from public.tags
  join jsonb_to_recordset(p_tags) as t(slug text, name text)
    on tags.slug = t.slug
    or lower(tags.name) = lower(trim(t.name));

  delete from public.article_tags
  where article_id = p_article_id
    and tag_id <> all (wanted_tag_ids);

  insert into public.article_tags (article_id, tag_id)
  select p_article_id, unnest(wanted_tag_ids)
  on conflict do nothing;
end;
$$;

revoke all on function public.set_article_tags(uuid, jsonb) from public, anon;
grant execute on function public.set_article_tags(uuid, jsonb) to authenticated;

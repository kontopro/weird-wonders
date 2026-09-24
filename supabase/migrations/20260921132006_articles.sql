create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.members(user_id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  slug text not null unique check (private.is_normalized_slug(slug)),
  excerpt text check (excerpt is null or char_length(excerpt) <= 500),
  content_version integer not null default 1 check (content_version > 0),
  content_blocks jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
  cover_image_id uuid references public.media_assets(id) on delete set null,
  cover_image_alt text check (cover_image_alt is null or char_length(cover_image_alt) <= 500),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'scheduled', 'published', 'archived')),
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  is_fact_of_day boolean not null default false,
  scheduled_at timestamptz,
  published_at timestamptz,
  seo_title text check (seo_title is null or char_length(seo_title) <= 60),
  seo_description text check (seo_description is null or char_length(seo_description) <= 160),
  social_image_id uuid references public.media_assets(id) on delete set null,
  reading_time_minutes integer check (reading_time_minutes is null or reading_time_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(content_blocks) = 'object'),
  check (jsonb_typeof(content_blocks -> 'version') = 'number'),
  check ((content_blocks ->> 'version')::integer = content_version),
  check (jsonb_typeof(content_blocks -> 'blocks') = 'array'),
  check (status <> 'scheduled' or scheduled_at is not null),
  check (status <> 'published' or published_at is not null),
  check (not is_fact_of_day or status = 'published'),
  check (status <> 'published' or cover_image_id is null or nullif(trim(cover_image_alt), '') is not null)
);

alter table public.articles enable row level security;

create unique index articles_one_fact_of_day_idx
on public.articles (is_fact_of_day)
where is_fact_of_day;

create index articles_status_published_idx on public.articles (status, published_at desc);
create index articles_author_status_idx on public.articles (author_id, status);
create index articles_category_status_idx on public.articles (category_id, status);
create index articles_featured_published_idx on public.articles (is_featured, published_at desc) where is_featured;
create index articles_trending_published_idx on public.articles (is_trending, published_at desc) where is_trending;

create or replace function private.prepare_article_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.author_id is not null and not exists (
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
    new.published_at = now();
  else
    new.published_at = null;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.prepare_article_write() from public;

create trigger articles_prepare_write
before insert or update on public.articles
for each row execute function private.prepare_article_write();

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

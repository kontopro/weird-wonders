-- Scheduled publishing without a background job.
--
-- A `scheduled` article becomes public as soon as `scheduled_at` has passed.
-- The same rule lives in `src/domain/publishing.ts`, which every data adapter
-- (mock and Supabase) applies, so both modes behave identically.

-- Public lists are ordered by the moment an article went (or goes) live.
alter table public.articles
  add column public_at timestamptz generated always as (coalesce(published_at, scheduled_at)) stored;

create index articles_status_public_at_idx on public.articles (status, public_at desc);

-- Visibility policies: published, or scheduled and due.
drop policy articles_public_read on public.articles;
create policy articles_public_read
on public.articles
for select
to anon, authenticated
using (
  status = 'published'
  or (status = 'scheduled' and scheduled_at <= now())
);

drop policy profiles_public_authors_read on public.profiles;
create policy profiles_public_authors_read
on public.profiles
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.articles
    where articles.author_id = profiles.id
      and (
        articles.status = 'published'
        or (articles.status = 'scheduled' and articles.scheduled_at <= now())
      )
  )
);

drop policy article_tags_public_read on public.article_tags;
create policy article_tags_public_read
on public.article_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.articles
    where articles.id = article_tags.article_id
      and (
        articles.status = 'published'
        or (articles.status = 'scheduled' and articles.scheduled_at <= now())
      )
  )
);

-- When a due scheduled article is later saved as `published`, keep the moment
-- it actually went live instead of the time of that save.
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
    new.published_at = case
      when old.status = 'scheduled' and old.scheduled_at <= now() then old.scheduled_at
      else now()
    end;
  else
    new.published_at = null;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

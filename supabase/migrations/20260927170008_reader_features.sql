-- Baseline 8/8 — reader-facing features: search, old-URL redirects, view
-- counts and newsletter sign-ups. Every rule has a mirror in the mock adapter.

-- Search ----------------------------------------------------------------
-- Accent- and case-insensitive full-text search over title, excerpt and the
-- text inside content blocks. The 'simple' configuration does no stemming,
-- which works for any language (Greek included) without extra dictionaries.

create or replace function private.search_text(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, '')));
$$;

create or replace function private.content_text(document jsonb)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(string_agg(value #>> '{}', ' '), '')
  from jsonb_path_query(
    document,
    'strict $.**.* ? (@.type() == "string" || @.type() == "array")'
  ) as found(value)
  where jsonb_typeof(value) = 'string'
    and length(value #>> '{}') > 0
    and (value #>> '{}') !~ '^[0-9a-f-]{36}$';
$$;

alter table public.articles
  add column search_document tsvector generated always as (
    to_tsvector(
      'simple',
      private.search_text(
        title || ' ' || coalesce(excerpt, '') || ' ' || private.content_text(content_blocks)
      )
    )
  ) stored;

create index articles_search_document_idx on public.articles using gin (search_document);

-- Runs with the caller's rights: visitors only ever find public articles.
-- Every word matches as a prefix ("δεντ" finds "δέντρα"). Returns ids in
-- rank order with the total count for pagination.
create or replace function public.search_articles(
  p_query text,
  p_language text,
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (article_id uuid, rank real, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with terms as (
    select regexp_replace(term, '[^[:alnum:]]', '', 'g') as term
    from regexp_split_to_table(private.search_text(p_query), '\s+') as term
  ),
  query as (
    select to_tsquery('simple', string_agg(quote_literal(term) || ':*', ' & ')) as q
    from terms
    where term <> ''
  )
  select a.id, ts_rank(a.search_document, query.q), count(*) over ()
  from public.articles a, query
  where query.q is not null
    and a.language = p_language
    and (a.status = 'published' or (a.status = 'scheduled' and a.scheduled_at <= now()))
    and a.search_document @@ query.q
  order by 2 desc, a.public_at desc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke all on function private.search_text(text) from public;
revoke all on function private.content_text(jsonb) from public;
grant execute on function private.search_text(text) to anon, authenticated;
grant execute on function private.content_text(jsonb) to anon, authenticated;
grant usage on schema private to anon;
revoke all on function public.search_articles(text, text, integer, integer) from public;
grant execute on function public.search_articles(text, text, integer, integer) to anon, authenticated;

-- Old URLs --------------------------------------------------------------
-- When the slug of an article that has been public changes, the old slug is
-- kept so links shared earlier redirect to the new address (301).

create table public.article_slug_history (
  language text not null,
  slug text not null check (private.is_normalized_slug(slug)),
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (language, slug)
);

alter table public.article_slug_history enable row level security;

create index article_slug_history_article_idx on public.article_slug_history (article_id);

create or replace function private.track_article_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A slug used by a public article is no longer a redirect. Drafts do not
  -- take over the address of a published article's old URL.
  if new.status = 'published' or (new.status = 'scheduled' and new.scheduled_at <= now()) then
    delete from public.article_slug_history
    where language = new.language
      and slug = new.slug
      and article_id <> new.id;
  end if;

  if tg_op = 'UPDATE'
    and (old.slug <> new.slug or old.language <> new.language)
    and old.published_at is not null then
    insert into public.article_slug_history (language, slug, article_id)
    values (old.language, old.slug, new.id)
    on conflict (language, slug) do update set article_id = excluded.article_id;
  end if;
  return new;
end;
$$;

revoke all on function private.track_article_slug() from public;

create trigger articles_track_slug
after insert or update of slug, language, status on public.articles
for each row execute function private.track_article_slug();

-- Current slug for an old one, only when the article is public now.
create or replace function public.resolve_article_slug(p_slug text, p_language text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.slug
  from public.article_slug_history h
  join public.articles a on a.id = h.article_id
  where h.language = p_language
    and h.slug = p_slug
    and a.language = p_language
    and (a.status = 'published' or (a.status = 'scheduled' and a.scheduled_at <= now()));
$$;

revoke all on function public.resolve_article_slug(text, text) from public;
grant execute on function public.resolve_article_slug(text, text) to anon, authenticated;

-- Views -----------------------------------------------------------------
-- One row per article per day; no visitor data is stored.

create table public.article_views (
  article_id uuid not null references public.articles(id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0 check (views >= 0),
  primary key (article_id, day)
);

alter table public.article_views enable row level security;

create index article_views_day_idx on public.article_views (day);

-- Counts a view of a public article. Server only (secret key): the app
-- limits how often each visitor counts, which a direct API call would skip.
create or replace function public.record_article_view(p_article_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.article_views (article_id, day, views)
  select a.id, current_date, 1
  from public.articles a
  where a.id = p_article_id
    and (a.status = 'published' or (a.status = 'scheduled' and a.scheduled_at <= now()))
  on conflict (article_id, day) do update set views = public.article_views.views + 1;
$$;

revoke all on function public.record_article_view(uuid) from public, anon, authenticated;
grant execute on function public.record_article_view(uuid) to service_role;

-- Views per article over the last p_days (all time when null), for the
-- popular list and the admin. Runs with the caller's rights (see policies).
create or replace function public.article_view_counts(p_days integer default null)
returns table (article_id uuid, views bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.article_id, sum(v.views)::bigint
  from public.article_views v
  where p_days is null or v.day > current_date - p_days
  group by v.article_id;
$$;

revoke all on function public.article_view_counts(integer) from public;
grant execute on function public.article_view_counts(integer) to anon, authenticated;

-- Newsletter ------------------------------------------------------------
-- Sign-ups with consent time and language. `token` builds confirm and
-- unsubscribe links; the app e-mails them through its e-mail provider
-- (server-side, with the secret key, see `claim_newsletter_confirmation`).

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    char_length(email) <= 320 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  language text not null check (language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  token uuid not null unique default gen_random_uuid(),
  consent_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  -- Last confirmation e-mail, to limit repeats to the same address.
  confirmation_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

create unique index newsletter_subscribers_email_idx
on public.newsletter_subscribers (lower(email));

create trigger newsletter_subscribers_set_updated_at
before update on public.newsletter_subscribers
for each row execute function private.set_updated_at();

-- Idempotent and silent: the same answer whether or not the address exists,
-- so the form cannot be used to discover subscribers.
create or replace function public.subscribe_newsletter(p_email text, p_language text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.newsletter_subscribers (email, language)
  values (lower(trim(p_email)), p_language)
  on conflict ((lower(email))) do update
  set language = excluded.language,
      consent_at = now(),
      status = 'pending',
      unsubscribed_at = null
  -- Confirmed subscribers stay as they are (nobody can change their language).
  where public.newsletter_subscribers.status <> 'confirmed';
$$;

create or replace function public.confirm_newsletter(p_token uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.newsletter_subscribers
  set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
  where token = p_token and status <> 'unsubscribed'
  returning true;
$$;

create or replace function public.unsubscribe_newsletter(p_token uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.newsletter_subscribers
  set status = 'unsubscribed', unsubscribed_at = now()
  where token = p_token
  returning true;
$$;

-- The server claims the right to send a confirmation e-mail: it gets the
-- token only for a pending address that has not had one in the last
-- `p_min_interval`, so the form cannot be used to flood someone's inbox, and
-- only while fewer than `p_hourly_limit` confirmations went out in the last
-- hour, so a flood of fake sign-ups cannot exhaust the e-mail quota.
-- Server only (secret key): visitors never see tokens.
create or replace function public.claim_newsletter_confirmation(
  p_email text,
  p_min_interval interval default interval '10 minutes',
  p_hourly_limit integer default 100
)
returns table (token uuid, language text)
language sql
security definer
set search_path = ''
as $$
  update public.newsletter_subscribers as subscriber
  set confirmation_sent_at = now()
  where lower(subscriber.email) = lower(trim(p_email))
    and subscriber.status = 'pending'
    and (
      subscriber.confirmation_sent_at is null
      or subscriber.confirmation_sent_at <= now() - p_min_interval
    )
    and (
      select count(*)
      from public.newsletter_subscribers as recent
      where recent.confirmation_sent_at > now() - interval '1 hour'
    ) < p_hourly_limit
  returning subscriber.token, subscriber.language;
$$;

-- Supabase grants new functions to anon/authenticated by default: revoke
-- from them explicitly, not only from public.
revoke all on function public.claim_newsletter_confirmation(text, interval, integer)
from public, anon, authenticated;
grant execute on function public.claim_newsletter_confirmation(text, interval, integer) to service_role;

revoke all on function public.subscribe_newsletter(text, text) from public;
revoke all on function public.confirm_newsletter(uuid) from public;
revoke all on function public.unsubscribe_newsletter(uuid) from public;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;
grant execute on function public.confirm_newsletter(uuid) to anon, authenticated;
grant execute on function public.unsubscribe_newsletter(uuid) to anon, authenticated;

-- Grants and policies ---------------------------------------------------

revoke all on table public.article_slug_history from anon, authenticated;
revoke all on table public.article_views from anon, authenticated;
revoke all on table public.newsletter_subscribers from anon, authenticated;

grant select on table public.article_views to anon, authenticated;
-- Every column except `token`: owners/admins manage the list but cannot act
-- on a subscriber's behalf.
grant select (
  id, email, language, status, consent_at, confirmed_at, unsubscribed_at,
  confirmation_sent_at, created_at, updated_at
) on table public.newsletter_subscribers to authenticated;
grant delete on table public.newsletter_subscribers to authenticated;

-- View counts are not personal: anyone may read counts of public articles;
-- members read all (admin statistics).
create policy article_views_public_read
on public.article_views
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.articles a
    where a.id = article_views.article_id
      and (a.status = 'published' or (a.status = 'scheduled' and a.scheduled_at <= now()))
  )
);

create policy article_views_members_read
on public.article_views
for select
to authenticated
using ((select private.is_active_member()));

-- Subscribers are personal data: owners and admins only.
create policy newsletter_subscribers_admin_read
on public.newsletter_subscribers
for select
to authenticated
using ((select private.has_role(array['owner', 'admin'])));

create policy newsletter_subscribers_admin_delete
on public.newsletter_subscribers
for delete
to authenticated
using ((select private.has_role(array['owner', 'admin'])));

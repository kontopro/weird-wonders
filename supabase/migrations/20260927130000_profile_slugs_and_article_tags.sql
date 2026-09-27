-- Public author pages need a stable, human-readable URL.
alter table public.profiles add column slug text;

update public.profiles
set slug = 'author-' || left(replace(id::text, '-', ''), 12)
where slug is null;

alter table public.profiles
  alter column slug set not null,
  add constraint profiles_slug_key unique (slug),
  add constraint profiles_slug_check check (
    private.is_normalized_slug(slug) and char_length(slug) <= 120
  );

-- New users get a neutral slug; they choose a readable one from their profile.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, slug, display_name, avatar_path)
  values (
    new.id,
    'author-' || left(replace(new.id::text, '-', ''), 12),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'User'
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

-- Replace an article's tags in one transaction. Runs with the caller's
-- rights, so RLS still decides who may edit the article and who may create
-- tags (editors and above). `p_tags` is `[{ "slug": "...", "name": "..." }]`;
-- slugs are produced by the application's slugify, which handles Greek.
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
  where not exists (select 1 from public.tags existing where existing.slug = t.slug)
  on conflict do nothing;

  select coalesce(array_agg(tags.id), '{}')
  into wanted_tag_ids
  from public.tags
  where tags.slug in (select t.slug from jsonb_to_recordset(p_tags) as t(slug text, name text));

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

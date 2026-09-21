create or replace function private.is_active_member_id(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members
    where user_id = target_user_id
      and status = 'active'
  );
$$;

revoke all on function private.is_active_member_id(uuid) from public;
grant execute on function private.is_active_member_id(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.media_assets enable row level security;
alter table public.site_settings enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.articles enable row level security;
alter table public.article_tags enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.members from anon, authenticated;
revoke all on table public.media_assets from anon, authenticated;
revoke all on table public.site_settings from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.tags from anon, authenticated;
revoke all on table public.articles from anon, authenticated;
revoke all on table public.article_tags from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant update on table public.profiles to authenticated;

grant select, insert, update, delete on table public.members to authenticated;

grant select on table public.media_assets to anon, authenticated;
grant insert, update, delete on table public.media_assets to authenticated;

grant select on table public.site_settings to anon, authenticated;
grant insert, update on table public.site_settings to authenticated;

grant select on table public.categories, public.tags to anon, authenticated;
grant insert, update, delete on table public.categories, public.tags to authenticated;

grant select on table public.articles, public.article_tags to anon, authenticated;
grant insert, update, delete on table public.articles, public.article_tags to authenticated;

create policy profiles_public_authors_read
on public.profiles
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.articles
    where articles.author_id = profiles.id
      and articles.status = 'published'
  )
);

create policy profiles_members_read
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (
    (select private.is_active_member())
    and (select private.is_active_member_id(id))
  )
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy members_read
on public.members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or ((select private.is_active_member()) and status = 'active')
);

create policy members_insert
on public.members
for insert
to authenticated
with check ((select private.can_manage_member(role)));

create policy members_update
on public.members
for update
to authenticated
using ((select private.can_manage_member(role)))
with check ((select private.can_manage_member(role)));

create policy members_delete
on public.members
for delete
to authenticated
using ((select private.can_manage_member(role)));

create policy media_assets_public_read
on public.media_assets
for select
to anon, authenticated
using (visibility = 'public');

create policy media_assets_member_read
on public.media_assets
for select
to authenticated
using (
  (select private.is_active_member())
  and (
    uploaded_by = (select auth.uid())
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
);

create policy media_assets_insert
on public.media_assets
for insert
to authenticated
with check (
  (select private.is_active_member())
  and uploaded_by = (select auth.uid())
  and (
    visibility = 'private'
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
);

create policy media_assets_update
on public.media_assets
for update
to authenticated
using (
  (uploaded_by = (select auth.uid()) and visibility = 'private')
  or (select private.has_role(array['owner', 'admin', 'editor']))
)
with check (
  (
    uploaded_by = (select auth.uid())
    and visibility = 'private'
    and storage_bucket = 'blog-private'
  )
  or (select private.has_role(array['owner', 'admin', 'editor']))
);

create policy media_assets_delete
on public.media_assets
for delete
to authenticated
using (
  (uploaded_by = (select auth.uid()) and visibility = 'private')
  or (select private.has_role(array['owner', 'admin', 'editor']))
);

create policy site_settings_public_read
on public.site_settings
for select
to anon, authenticated
using (true);

create policy site_settings_insert
on public.site_settings
for insert
to authenticated
with check ((select private.has_role(array['owner', 'admin'])));

create policy site_settings_update
on public.site_settings
for update
to authenticated
using ((select private.has_role(array['owner', 'admin'])))
with check ((select private.has_role(array['owner', 'admin'])));

create policy categories_public_read
on public.categories
for select
to anon, authenticated
using (true);

create policy categories_editor_insert
on public.categories
for insert
to authenticated
with check ((select private.has_role(array['owner', 'admin', 'editor'])));

create policy categories_editor_update
on public.categories
for update
to authenticated
using ((select private.has_role(array['owner', 'admin', 'editor'])))
with check ((select private.has_role(array['owner', 'admin', 'editor'])));

create policy categories_editor_delete
on public.categories
for delete
to authenticated
using ((select private.has_role(array['owner', 'admin', 'editor'])));

create policy tags_public_read
on public.tags
for select
to anon, authenticated
using (true);

create policy tags_editor_insert
on public.tags
for insert
to authenticated
with check ((select private.has_role(array['owner', 'admin', 'editor'])));

create policy tags_editor_update
on public.tags
for update
to authenticated
using ((select private.has_role(array['owner', 'admin', 'editor'])))
with check ((select private.has_role(array['owner', 'admin', 'editor'])));

create policy tags_editor_delete
on public.tags
for delete
to authenticated
using ((select private.has_role(array['owner', 'admin', 'editor'])));

create policy articles_public_read
on public.articles
for select
to anon, authenticated
using (status = 'published');

create policy articles_members_read
on public.articles
for select
to authenticated
using ((select private.is_active_member()));

create policy articles_insert
on public.articles
for insert
to authenticated
with check (
  (select private.has_role(array['owner', 'admin', 'editor']))
  or (
    (select private.current_member_role()) = 'author'
    and author_id = (select auth.uid())
    and status = 'draft'
    and not is_featured
    and not is_trending
    and not is_fact_of_day
    and scheduled_at is null
    and published_at is null
  )
);

create policy articles_update
on public.articles
for update
to authenticated
using (
  (select private.has_role(array['owner', 'admin', 'editor']))
  or (
    (select private.current_member_role()) = 'author'
    and author_id = (select auth.uid())
    and status in ('draft', 'in_review')
  )
)
with check (
  (select private.has_role(array['owner', 'admin', 'editor']))
  or (
    (select private.current_member_role()) = 'author'
    and author_id = (select auth.uid())
    and status in ('draft', 'in_review')
    and not is_featured
    and not is_trending
    and not is_fact_of_day
    and scheduled_at is null
    and published_at is null
  )
);

create policy articles_editor_delete
on public.articles
for delete
to authenticated
using ((select private.has_role(array['owner', 'admin', 'editor'])));

create policy article_tags_public_read
on public.article_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.articles
    where articles.id = article_tags.article_id
      and articles.status = 'published'
  )
);

create policy article_tags_members_read
on public.article_tags
for select
to authenticated
using ((select private.is_active_member()));

create policy article_tags_insert
on public.article_tags
for insert
to authenticated
with check ((select private.can_edit_article(article_id)));

create policy article_tags_delete
on public.article_tags
for delete
to authenticated
using ((select private.can_edit_article(article_id)));

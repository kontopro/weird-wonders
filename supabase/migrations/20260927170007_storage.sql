-- Baseline 7/7 — Storage buckets and their access policies.
--
-- `blog-public` serves published images by URL; `blog-private` holds uploads
-- that are not public yet. Both accept images only, up to 10 MB. SVG is
-- excluded because it can carry scripts.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'blog-private', 'blog-private', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  ),
  (
    'blog-public', 'blog-public', true, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Who may write where, the same for both buckets: editors and above under
-- the known folders, other active members only under `media/<their user id>/`.
-- Suspended members can no longer change or delete anything.
create or replace function private.may_write_storage_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_active_member())
    and (
      (
        (select private.has_role(array['owner', 'admin', 'editor']))
        and (storage.foldername(object_name))[1] in ('branding', 'articles', 'media')
      )
      or (
        (storage.foldername(object_name))[1] = 'media'
        and (storage.foldername(object_name))[2] = (select auth.uid())::text
      )
    );
$$;

-- Changing or deleting an existing file: its uploader (while active) or an editor.
create or replace function private.may_change_storage_object(object_owner text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_active_member())
    and (
      object_owner = (select auth.uid())::text
      or (select private.has_role(array['owner', 'admin', 'editor']))
    );
$$;

revoke all on function private.may_write_storage_path(text) from public;
revoke all on function private.may_change_storage_object(text) from public;
grant execute on function private.may_write_storage_path(text) to authenticated;
grant execute on function private.may_change_storage_object(text) to authenticated;

create policy storage_private_member_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'blog-private'
  and (select private.may_change_storage_object(owner_id))
);

create policy storage_private_member_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'blog-private'
  and owner_id = (select auth.uid())::text
  and (select private.may_write_storage_path(name))
);

-- Renames must stay where the member may upload (no moving into `branding/`).
create policy storage_private_member_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'blog-private'
  and (select private.may_change_storage_object(owner_id))
)
with check (
  bucket_id = 'blog-private'
  and (select private.may_change_storage_object(owner_id))
  and (select private.may_write_storage_path(name))
);

create policy storage_private_member_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'blog-private'
  and (select private.may_change_storage_object(owner_id))
);

create policy storage_public_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'blog-public'
  and (select private.may_write_storage_path(name))
);

-- Lets uploaders read their upload responses; anonymous visitors use public
-- URLs and cannot list the bucket.
create policy storage_public_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'blog-public'
  and (select private.may_change_storage_object(owner_id))
);

create policy storage_public_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'blog-public'
  and (select private.may_change_storage_object(owner_id))
)
with check (
  bucket_id = 'blog-public'
  and (select private.may_change_storage_object(owner_id))
  and (select private.may_write_storage_path(name))
);

create policy storage_public_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'blog-public'
  and (select private.may_change_storage_object(owner_id))
);

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

create policy storage_private_member_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'blog-private'
  and (select private.is_active_member())
  and (
    owner_id = (select auth.uid())::text
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
);

create policy storage_private_member_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'blog-private'
  and (select private.is_active_member())
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] in ('branding', 'articles', 'media')
);

create policy storage_private_member_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'blog-private'
  and (
    owner_id = (select auth.uid())::text
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
)
with check (
  bucket_id = 'blog-private'
  and (storage.foldername(name))[1] in ('branding', 'articles', 'media')
  and (
    owner_id = (select auth.uid())::text
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
);

create policy storage_private_member_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'blog-private'
  and (
    owner_id = (select auth.uid())::text
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
);

-- Public bucket: editors write anywhere under the known folders; other
-- active members only under `media/<their user id>/`.
create policy storage_public_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'blog-public'
  and (select private.is_active_member())
  and (
    (
      (select private.has_role(array['owner', 'admin', 'editor']))
      and (storage.foldername(name))[1] in ('branding', 'articles', 'media')
    )
    or (
      (storage.foldername(name))[1] = 'media'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    )
  )
);

-- Lets uploaders read their upload responses; anonymous visitors use public
-- URLs and cannot list the bucket.
create policy storage_public_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'blog-public'
  and (
    owner_id = (select auth.uid())::text
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
);

create policy storage_public_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'blog-public'
  and (
    owner_id = (select auth.uid())::text
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
)
with check (
  bucket_id = 'blog-public'
  and (storage.foldername(name))[1] in ('branding', 'articles', 'media')
  and (
    owner_id = (select auth.uid())::text
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
);

create policy storage_public_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'blog-public'
  and (
    owner_id = (select auth.uid())::text
    or (select private.has_role(array['owner', 'admin', 'editor']))
  )
);

insert into storage.buckets (id, name, public)
values
  ('blog-private', 'blog-private', false),
  ('blog-public', 'blog-public', true)
on conflict (id) do nothing;

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

create policy storage_public_editor_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'blog-public'
  and (select private.has_role(array['owner', 'admin', 'editor']))
  and (storage.foldername(name))[1] in ('branding', 'articles', 'media')
);

create policy storage_public_editor_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'blog-public'
  and (select private.has_role(array['owner', 'admin', 'editor']))
);

create policy storage_public_editor_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'blog-public'
  and (select private.has_role(array['owner', 'admin', 'editor']))
)
with check (
  bucket_id = 'blog-public'
  and (select private.has_role(array['owner', 'admin', 'editor']))
  and (storage.foldername(name))[1] in ('branding', 'articles', 'media')
);

create policy storage_public_editor_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'blog-public'
  and (select private.has_role(array['owner', 'admin', 'editor']))
);

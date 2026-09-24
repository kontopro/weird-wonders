create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.members(user_id) on delete restrict,
  storage_bucket text not null check (storage_bucket in ('blog-private', 'blog-public')),
  storage_path text not null check (
    storage_path ~ '^(branding|articles|media)/[^/]+/.+'
    and storage_path !~ '(^|/)\.\.(/|$)'
  ),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  mime_type text not null check (mime_type ~ '^[-\w.]+/[-+\w.]+$'),
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text check (alt_text is null or char_length(alt_text) <= 500),
  caption text check (caption is null or char_length(caption) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (
    (visibility = 'private' and storage_bucket = 'blog-private')
    or (visibility = 'public' and storage_bucket = 'blog-public')
  )
);

alter table public.media_assets enable row level security;

create index media_assets_created_at_idx on public.media_assets (created_at desc);
create index media_assets_uploader_visibility_idx on public.media_assets (uploaded_by, visibility);

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function private.set_updated_at();

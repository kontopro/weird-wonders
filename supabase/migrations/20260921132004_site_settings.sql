create table public.site_settings (
  id boolean primary key default true check (id),
  name text not null check (char_length(name) between 1 and 120),
  tagline text check (tagline is null or char_length(tagline) <= 240),
  default_language text not null default 'el' check (default_language ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  logo_asset_id uuid references public.media_assets(id) on delete set null,
  favicon_asset_id uuid references public.media_assets(id) on delete set null,
  theme_key text not null default 'editorial' check (private.is_normalized_slug(theme_key)),
  layout_key text not null default 'editorial' check (private.is_normalized_slug(layout_key)),
  branding jsonb not null default '{}'::jsonb check (jsonb_typeof(branding) = 'object'),
  navigation jsonb not null default '[]'::jsonb check (jsonb_typeof(navigation) = 'array'),
  homepage_config jsonb not null default '{}'::jsonb check (jsonb_typeof(homepage_config) = 'object'),
  seo_config jsonb not null default '{}'::jsonb check (jsonb_typeof(seo_config) = 'object'),
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function private.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (private.is_normalized_slug(slug)),
  description text check (description is null or char_length(description) <= 1000),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  icon_key text check (icon_key is null or private.is_normalized_slug(icon_key)),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (private.is_normalized_slug(slug)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.tags enable row level security;

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger tags_set_updated_at
before update on public.tags
for each row execute function private.set_updated_at();

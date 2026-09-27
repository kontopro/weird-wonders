-- Baseline 4/7 — categories (one per article) and tags (many per article).
-- The categories of a specific blog are data: see `supabase/seed.sql`.
--
-- A category or tag row is written in the blog's main language; translations
-- to other languages live in `category_translations` / `tag_translations`.

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

create unique index categories_name_ci_idx on public.categories (lower(name));
create unique index tags_name_ci_idx on public.tags (lower(name));

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger tags_set_updated_at
before update on public.tags
for each row execute function private.set_updated_at();

create table public.category_translations (
  category_id uuid not null references public.categories(id) on delete cascade,
  language text not null check (language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null check (private.is_normalized_slug(slug)),
  description text check (description is null or char_length(description) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category_id, language),
  unique (language, slug)
);

create table public.tag_translations (
  tag_id uuid not null references public.tags(id) on delete cascade,
  language text not null check (language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null check (private.is_normalized_slug(slug)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tag_id, language),
  unique (language, slug)
);

alter table public.category_translations enable row level security;
alter table public.tag_translations enable row level security;

create unique index category_translations_name_ci_idx
on public.category_translations (language, lower(name));
create unique index tag_translations_name_ci_idx on public.tag_translations (language, lower(name));

create trigger category_translations_set_updated_at
before update on public.category_translations
for each row execute function private.set_updated_at();

create trigger tag_translations_set_updated_at
before update on public.tag_translations
for each row execute function private.set_updated_at();

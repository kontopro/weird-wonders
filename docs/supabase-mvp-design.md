# Cloneable Supabase MVP design

Status: **approved architecture — initial migrations created but not applied to any database**.

This document defines the database contract for a reusable blog starter. FACTάκι is the first real implementation, but every new blog will be created as an independent repository with an independent Supabase project. The same version-controlled migrations will initialize each project.

## Architecture decision

1. One repository and one Supabase project represent exactly one blog.
2. The React application and Supabase migrations form a reusable starter that can be cloned for a new blog.
3. There is no runtime multi-tenancy and no `site_id` column. Project-level isolation replaces row-level tenant isolation.
4. `site_settings` is a singleton row for the current blog. Public branding defaults may also live in `src/config/site.ts` so the application has a safe build-time fallback.
5. Roles live in `members`; `profiles` contains no authorization role.
6. Use `text` columns with `check` constraints for workflow values instead of PostgreSQL enums.
7. Article content is stored as versioned JSON and validated by the application Zod schema before every write.
8. Production users, credentials, domains and content are never committed to starter migrations or seed data.
9. Schema upgrades are added as new migrations. Already-applied or published migration history is never rewritten.

## Clone workflow

```text
reusable-blog-starter
  ├── React application
  ├── Supabase migrations and tests
  ├── generic seed data
  └── .env.example
          │
          ├──> FACTάκι repository + FACTάκι Supabase project
          ├──> Blog B repository + Blog B Supabase project
          └──> Blog C repository + Blog C Supabase project
```

For the current phase, FACTάκι remains the source implementation. Once the application and first migrations are stable, a separate clean starter repository can be extracted from it. Blog-specific content and branding must not be copied into the generic starter.

## Entity model

```text
auth.users 1──1 profiles
    │
    └──1 members

site_settings 1──1 current project/blog

categories 1──< articles >── profiles
                      │
                      ├──< article_tags >── tags
                      └──> media_assets
```

All UUID primary keys use `gen_random_uuid()` except `profiles.id` and `members.user_id`, which correspond to `auth.users.id`.

## MVP tables

### `profiles`

```text
id uuid primary key references auth.users(id) on delete cascade
display_name text not null
avatar_path text null
bio text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Email and authorization data remain in Auth. Anonymous profile reads are limited to authors of published articles. Authenticated members can read basic profiles and update only their own profile.

### `members`

```text
user_id uuid primary key references profiles(id) on delete restrict
role text not null
status text not null default 'active'
invited_by uuid null references profiles(id) on delete set null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `role in ('owner', 'admin', 'editor', 'author')`
- `status in ('active', 'suspended')`

The first owner is created through a narrow bootstrap function or trusted setup operation. Owner transfer/removal must never leave the project without an active owner.

### `media_assets`

```text
id uuid primary key default gen_random_uuid()
uploaded_by uuid null references members(user_id) on delete restrict
storage_bucket text not null
storage_path text not null
visibility text not null default 'private'
mime_type text not null
file_size_bytes bigint null
width integer null
height integer null
alt_text text null
caption text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `unique(storage_bucket, storage_path)`
- `visibility in ('private', 'public')`
- positive size and dimensions when present

### `site_settings`

```text
id boolean primary key default true check (id)
name text not null
tagline text null
default_language text not null default 'el'
logo_asset_id uuid null references media_assets(id) on delete set null
favicon_asset_id uuid null references media_assets(id) on delete set null
theme_key text not null default 'editorial'
layout_key text not null default 'editorial'
branding jsonb not null default '{}'
navigation jsonb not null default '[]'
homepage_config jsonb not null default '{}'
seo_config jsonb not null default '{}'
social_links jsonb not null default '{}'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

The constant boolean primary key enforces a single row. This table contains public/rendering-safe configuration only; secrets and integration credentials stay in environment variables or a server-only secret store.

### `categories`

```text
id uuid primary key default gen_random_uuid()
name text not null
slug text not null unique
description text null
color text null
icon_key text null
sort_order integer not null default 0
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Slugs are normalized lowercase values. Icon and color values are interpreted through controlled frontend presets.

### `tags`

```text
id uuid primary key default gen_random_uuid()
name text not null
slug text not null unique
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `articles`

```text
id uuid primary key default gen_random_uuid()
author_id uuid null references members(user_id) on delete restrict
category_id uuid null references categories(id) on delete set null
title text not null
slug text not null unique
excerpt text null
content_version integer not null default 1
content_blocks jsonb not null default '{"version":1,"blocks":[]}'
cover_image_id uuid null references media_assets(id) on delete set null
cover_image_alt text null
status text not null default 'draft'
is_featured boolean not null default false
is_trending boolean not null default false
is_fact_of_day boolean not null default false
scheduled_at timestamptz null
published_at timestamptz null
seo_title text null
seo_description text null
social_image_id uuid null references media_assets(id) on delete set null
reading_time_minutes integer null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints and invariants:

- `status in ('draft', 'in_review', 'scheduled', 'published', 'archived')`
- `reading_time_minutes > 0` when present
- content JSON is an object with matching `content_version`, integer `version` and array `blocks`
- published rows require `published_at`
- scheduled rows require `scheduled_at`
- cover alt text is required when a cover exists on a published article
- a partial unique index permits at most one `is_fact_of_day = true` article

Detailed block validation remains versioned application logic. Database checks validate only the document envelope and critical relational/workflow invariants.

### `article_tags`

```text
article_id uuid not null references articles(id) on delete cascade
tag_id uuid not null references tags(id) on delete cascade
created_at timestamptz not null default now()
primary key (article_id, tag_id)
```

## Workflow and permissions

```text
author: draft → in_review
editor: draft ↔ in_review → scheduled | published | archived
admin/owner: editor permissions plus project configuration and members
```

- Authors can create and edit only their own draft or review articles.
- Authors cannot publish, schedule, archive or reassign authorship.
- Editors manage all article states.
- Admins manage settings and non-owner members.
- Ownership changes go through protected database logic.
- `published_at` is set by trusted database logic on first publication.
- Automatic scheduled publication requires a later trusted scheduled job.

## RLS approach

RLS still protects the public API even though tenant isolation is handled by separate projects. Small helper functions may expose only the current authenticated member role:

```text
is_active_member() → boolean
has_role(allowed_roles text[]) → boolean
```

Security-definer helpers must have a fixed empty `search_path`, fully qualified references, minimum execution grants and direct tests. No service-role credential is exposed through `VITE_*` variables or browser code.

| Table | Anonymous | Author | Editor | Admin | Owner |
| --- | --- | --- | --- | --- | --- |
| `profiles` | published authors only | read members, update self | same | same | same |
| `members` | — | read self | read active members | manage non-owners | protected full control |
| `site_settings` | read | read | read | read/update | read/update |
| `media_assets` | public metadata | own uploads | manage all | manage all | manage all |
| `categories` | read | read | create/read/update/delete | same | same |
| `tags` | read | read | create/read/update/delete | same | same |
| `articles` | published only | create/read, update own drafts/reviews | full editorial scope | same | same |
| `article_tags` | published links only | own editable articles | full editorial scope | same | same |

## Storage

Use two buckets:

```text
blog-private  (private drafts and uploads)
blog-public   (explicitly published assets)
```

Suggested paths:

```text
branding/{asset_id}/{filename}
articles/{article_id}/{asset_id}/{filename}
media/{asset_id}/{filename}
```

Authors upload to the private bucket. Publishing promotes required assets through trusted orchestration and updates `media_assets`. If reliable promotion is deferred, keep assets private and use a server proxy or signed URLs rather than exposing draft media.

## Initial indexes

Do not duplicate primary-key or unique-constraint indexes. Add:

```text
members(status, role)
articles(status, published_at desc)
articles(author_id, status)
articles(category_id, status)
articles(is_featured, published_at desc) where is_featured
articles(is_trending, published_at desc) where is_trending
article_tags(tag_id, article_id)
media_assets(created_at desc)
media_assets(uploaded_by, visibility)
```

Query plans should be measured before adding more indexes.

## Migration sequence

1. `0001_extensions_and_helpers` — extensions, generic `updated_at` trigger and checks.
2. `0002_profiles_and_members` — profiles, members, Auth profile bootstrap and role helpers.
3. `0003_media_assets` — media metadata and relational constraints.
4. `0004_site_settings` — singleton public-safe blog configuration.
5. `0005_taxonomy` — categories and tags.
6. `0006_articles` — articles, workflow rules and media references.
7. `0007_article_tags` — article/tag join table.
8. `0008_rls` — enable RLS and add policies table by table.
9. `0009_storage` — buckets and Storage object policies.
10. `0010_seed_development` — optional generic local demo content only.

Generated TypeScript database types follow migrations and are committed separately from hand-written application domain types.

## Required tests

Tests run against direct Supabase REST/SQL and Storage behavior, not merely hidden UI controls.

1. Anonymous users can read settings, taxonomy, public media metadata and published articles only.
2. Anonymous users cannot read drafts, members or private media.
3. Authors can create drafts as themselves, edit their drafts and submit for review.
4. Authors cannot publish, schedule, reassign authorship, change settings or manage members.
5. Editors can review and publish all articles but cannot manage members or project settings.
6. Admins can manage non-owner members and settings but cannot remove or demote the final active owner.
7. Article block validation rejects unsafe URLs, malformed blocks, duplicate IDs and unsupported schema versions.
8. The public renderer safely handles an unknown stored block.
9. Storage policies reject unauthorized writes, public draft access and invalid promotion/deletion.
10. No service credential is present in the browser bundle.
11. The complete migration set initializes a fresh empty Supabase project without manual schema edits.

The last assertion is what makes the Supabase setup genuinely cloneable.

## Starter extraction checklist

Before creating `reusable-blog-starter`:

- replace FACTάκι branding and content with neutral examples
- keep all migrations and RLS/Storage tests
- include `.env.example`, never a real `.env`
- document fresh Supabase project creation and migration application
- document the small set of required branding/configuration changes
- verify a clean clone builds and a fresh database initializes end to end
- tag the starter version used by each new blog

## Deferred after MVP

- pre-account invitations
- article revisions and rollback UI
- scheduled publishing worker
- comments, newsletter, analytics and commerce
- AI drafting agents
- automated unused-media cleanup
- extracting shared packages if maintaining several cloned blogs becomes repetitive

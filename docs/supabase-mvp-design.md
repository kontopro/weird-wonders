# Supabase multi-tenant MVP design

Status: **proposed for approval — no migration has been created or applied**.

This document defines the first Supabase implementation for the reusable blog platform. FACTάκι remains the first tenant and the `factaki` theme preset. Production content, users, credentials, and environment values are not part of this design document or future seed data.

## Decisions

1. Use one Supabase project and shared tables. Every tenant-owned row carries `site_id`.
2. Use `text` columns with `check` constraints for workflow values instead of PostgreSQL enums. Adding a future value remains a small constraint migration and does not require enum-value lifecycle handling.
3. Keep roles exclusively in `site_members`. `profiles` never contains a global role.
4. Add `sites.is_public`. `status = 'active'` expresses lifecycle; `is_public` independently controls anonymous visibility.
5. Keep `site_settings` strictly public/rendering-safe. Secrets and internal integration settings do not belong in this table.
6. Do not model pre-account email invitations in the first MVP. A membership row always references an existing Auth user. A later `site_invitations` table can add invitation tokens and expiry without weakening `site_members`.
7. Use composite foreign keys to enforce tenant ownership for categories, authors, tags, and join rows.
8. Reference media by `media_assets.id` where a relational column exists. Paths are metadata of the asset, not duplicated across articles and settings.
9. Keep `article_revisions` outside the first MVP. The schema leaves room to add checkpoint revisions later.
10. Validate article JSON with the application Zod schema before every write. PostgreSQL checks the document envelope (`version` and `blocks`), while detailed block validation remains versioned application logic.
11. Membership bootstrap, ownership transfer, and domain verification require narrow database functions or trusted server operations. They are not ordinary browser table updates.

## Entity model

```text
auth.users 1──1 profiles
    │
    └──< site_members >── sites 1──1 site_settings
                              │
                              ├──< site_domains
                              ├──< categories
                              ├──< tags
                              ├──< media_assets
                              └──< articles >── categories
                                      │
                                      └──< article_tags >── tags
```

All UUID primary keys use `gen_random_uuid()` except `profiles.id`, which is the corresponding `auth.users.id`.

## Final MVP tables

### `profiles`

```text
id uuid primary key references auth.users(id) on delete cascade
display_name text not null
avatar_path text null
bio text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

No email or authorization data is copied from Auth. Public profile reads are limited to authors of published articles; authenticated users can read/update their own profile and basic profiles of active co-members.

### `sites`

```text
id uuid primary key default gen_random_uuid()
name text not null
slug text not null
default_language text not null default 'el'
status text not null default 'active'
is_public boolean not null default false
created_by uuid null references profiles(id) on delete set null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `unique(slug)`
- normalized slug check: lowercase ASCII letters, numbers, and single hyphens
- `status in ('active', 'inactive', 'archived')`
- language uses a conservative BCP-47-compatible format check

`created_by` is audit information only. Ownership is determined solely by `site_members`.

### `site_domains`

```text
id uuid primary key default gen_random_uuid()
site_id uuid not null references sites(id) on delete cascade
hostname text not null
is_primary boolean not null default false
is_verified boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

- `unique(hostname)`
- hostname is lowercase, contains no protocol/path/port/trailing dot
- partial unique index on `site_id where is_primary`

Owners/admins may register an unverified domain. Only a trusted verification flow may set `is_verified = true`. Anonymous domain resolution sees verified domains of public active sites only.

### `site_members`

```text
site_id uuid not null references sites(id) on delete cascade
user_id uuid not null references profiles(id) on delete restrict
role text not null
status text not null default 'active'
invited_by uuid null references profiles(id) on delete set null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
primary key (site_id, user_id)
```

Constraints:

- `role in ('owner', 'admin', 'editor', 'author')`
- `status in ('active', 'suspended')`

Membership rows are normally suspended rather than deleted after they own authored content. Admins manage non-owner memberships. Owner changes go through a transaction-safe function that locks the site's active owners and refuses to leave the site without one.

### `media_assets`

Created before settings/articles so those tables can reference asset IDs.

```text
id uuid primary key default gen_random_uuid()
site_id uuid not null references sites(id) on delete cascade
uploaded_by uuid null
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
- `unique(site_id, id)` for composite references
- `(site_id, uploaded_by)` references `site_members(site_id, user_id)` and uses `on delete restrict`
- `visibility in ('private', 'public')`
- positive size/dimensions when present
- storage path begins with `sites/{site_id}/`

### `site_settings`

```text
site_id uuid primary key references sites(id) on delete cascade
tagline text null
logo_asset_id uuid null
favicon_asset_id uuid null
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

Composite foreign keys ensure logo/favicon assets belong to the same site. JSON fields contain validated data only. Theme/layout keys must map to code-owned presets; FACTάκι uses `theme_key = 'factaki'` and `layout_key = 'editorial'`.

### `categories`

```text
id uuid primary key default gen_random_uuid()
site_id uuid not null references sites(id) on delete cascade
name text not null
slug text not null
description text null
color text null
icon_key text null
sort_order integer not null default 0
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints: `unique(site_id, slug)` and `unique(site_id, id)`. Icon and color values are interpreted only through controlled frontend presets.

### `tags`

```text
id uuid primary key default gen_random_uuid()
site_id uuid not null references sites(id) on delete cascade
name text not null
slug text not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints: `unique(site_id, slug)` and `unique(site_id, id)`.

### `articles`

```text
id uuid primary key default gen_random_uuid()
site_id uuid not null references sites(id) on delete cascade
author_id uuid null
category_id uuid null
title text not null
slug text not null
excerpt text null
content_version integer not null default 1
content_blocks jsonb not null default '{"version":1,"blocks":[]}'
cover_image_id uuid null
cover_image_alt text null
status text not null default 'draft'
is_featured boolean not null default false
is_trending boolean not null default false
is_fact_of_day boolean not null default false
scheduled_at timestamptz null
published_at timestamptz null
seo_title text null
seo_description text null
social_image_id uuid null
reading_time_minutes integer null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints and invariants:

- `unique(site_id, slug)` and `unique(site_id, id)`
- `(site_id, author_id)` references `site_members(site_id, user_id)` using `on delete restrict`
- `(site_id, category_id)` references `categories(site_id, id)`
- cover/social composite references point to `media_assets(site_id, id)`
- `status in ('draft', 'in_review', 'scheduled', 'published', 'archived')`
- `reading_time_minutes > 0` when present
- JSON is an object with matching `content_version`, integer `version`, and array `blocks`
- published rows require `published_at`
- scheduled rows require `scheduled_at` and no past time at creation
- cover alt is required when a cover is present and the row becomes published
- partial unique index allows at most one `is_fact_of_day = true` row per site

The author's membership must also be active at write time. The composite foreign key proves tenant membership; a trigger or narrow write function enforces active status.

### `article_tags`

```text
site_id uuid not null references sites(id) on delete cascade
article_id uuid not null
tag_id uuid not null
created_at timestamptz not null default now()
primary key (article_id, tag_id)
```

Composite foreign keys:

- `(site_id, article_id)` → `articles(site_id, id)` on delete cascade
- `(site_id, tag_id)` → `tags(site_id, id)` on delete cascade
- `unique(site_id, article_id, tag_id)` for an explicit tenant-scoped identity

These constraints make cross-tenant article/tag links impossible even when a browser changes `site_id` manually.

## Workflow rules

```text
author: draft → in_review
editor: draft ↔ in_review → scheduled | published | archived
admin/owner: same content permissions as editor
```

- Authors can insert only with `author_id = auth.uid()` and status `draft`.
- Authors can edit only their own `draft` or `in_review` rows and cannot move a row to `published`, `scheduled`, or `archived`.
- Editors can manage all article states within an active membership site.
- `published_at` is set by trusted database logic when first published, not accepted blindly from the browser.
- Automatic scheduled publishing needs a later trusted scheduled job. Until that exists, editors can schedule a timestamp but no claim is made that publication will happen automatically.

## RLS helpers

Use small `security definer` functions only to avoid recursive membership policies:

```text
is_active_site_member(target_site_id uuid) → boolean
has_site_role(target_site_id uuid, allowed_roles text[]) → boolean
```

Requirements:

- fixed `search_path = ''`
- fully qualified object references
- owned by a migration owner, not by a normal application user
- revoke from `public`; grant only the minimum execution rights to `authenticated`
- stable/read-only implementation
- tested directly for Site A/Site B isolation

Site creation uses a separate `create_site(...)` function so site, settings, and first owner membership are inserted atomically. Ownership transfer/removal uses another narrow function with row locking. Neither operation trusts a browser-supplied owner UUID other than `auth.uid()` where appropriate.

## RLS matrix

Legend: `R` read, `C` create, `U` update, `D` delete, `—` denied.

| Table | Anonymous | Author | Editor | Admin | Owner |
| --- | --- | --- | --- | --- | --- |
| `profiles` | R published authors only | R self/co-members, U self | same | same | same |
| `sites` | R active public | R own memberships | R own memberships | R/U own site | R/U own site |
| `site_domains` | R verified public mappings | R own site | R own site | C/R/U unverified | C/R/U plus ownership controls |
| `site_members` | — | R own row | R active co-members | C/R/U/D non-owners | C/R/U/D via protected ownership flow |
| `media_assets` | R public metadata | C/R/U own private assets | C/R/U/D site assets | full site scope | full site scope |
| `site_settings` | R active public sites | R own site | R own site | R/U own site | R/U own site |
| `categories` | R public-site categories | R | C/R/U/D | C/R/U/D | C/R/U/D |
| `tags` | R public-site tags | R | C/R/U/D | C/R/U/D | C/R/U/D |
| `articles` | R published public-site rows | C own, R site, U own draft/review | C/R/U/D site | C/R/U/D site | C/R/U/D site |
| `article_tags` | R links for published articles | C/R/D own editable articles | C/R/D site | C/R/D site | C/R/D site |

Important policy details:

- Anonymous article reads require both `articles.status = 'published'` and an active public parent site.
- Anonymous category/tag reads are limited to active public sites; later they may be narrowed to only values used by published articles if enumeration becomes a concern.
- Multiple permissive RLS policies are reviewed as a combined OR expression. Author write policies must contain restrictive `with check` conditions preventing self-promotion to published states.
- `is_verified`, first-owner creation, owner removal, and publish timestamps are protected by functions/triggers rather than trusting ordinary row updates.

## Storage design

Use two buckets to prevent unpublished assets from becoming publicly guessable:

```text
site-private  (private bucket)
site-public   (public bucket)
```

Paths:

```text
sites/{site_id}/branding/{asset_id}/{filename}
sites/{site_id}/articles/{article_id}/{asset_id}/{filename}
sites/{site_id}/media/{asset_id}/{filename}
```

Rules:

1. Authors may upload to `site-private` only for an active site membership and only beneath their site's prefix.
2. Editors/admins/owners may manage private site objects; authors may update/delete only assets they uploaded and which are not attached to published content.
3. Browser uploads validate MIME type and size before upload; database/storage policies still validate membership and path ownership.
4. Publishing promotes required assets to `site-public` through trusted server/database orchestration and updates `media_assets` atomically as far as the Storage API allows. A failed promotion must not publish a row with broken public media.
5. Public bucket objects contain only explicitly published assets. Draft objects never enter the public bucket.
6. Deleting metadata does not silently orphan or remove Storage objects. Cleanup is an explicit trusted operation with retry/audit handling.
7. No service-role key is exposed through `VITE_*` variables or browser code.

If promotion proves too complex for the first deployment, the safer fallback is a private bucket with a server media proxy/signed-URL strategy—not making the draft bucket public.

## Indexes

Do not duplicate indexes already created by primary/unique constraints. Add initially:

```text
site_members(user_id) where status = 'active'
site_members(site_id, status, role)
site_domains(site_id)
articles(site_id, status, published_at desc)
articles(site_id, author_id, status)
articles(site_id, category_id, status)
articles(site_id, is_featured, published_at desc) where is_featured
articles(site_id, is_trending, published_at desc) where is_trending
article_tags(site_id, tag_id, article_id)
media_assets(site_id, created_at desc)
media_assets(site_id, uploaded_by, visibility)
```

The unique `(site_id, slug)` constraints already cover the common slug lookups for articles, categories, and tags. Query plans should be measured before adding more indexes.

## Migration sequence

No file in this sequence should be applied until this design is approved.

1. `0001_extensions_and_helpers` — required extensions, generic `updated_at` trigger function, normalization/check helpers.
2. `0002_profiles_and_sites` — profiles, sites, profile bootstrap trigger, site lifecycle checks.
3. `0003_memberships_and_site_bootstrap` — site_members, membership helpers, atomic `create_site`, protected owner operations.
4. `0004_domains_and_media` — site_domains, media_assets, verification protections and relational constraints.
5. `0005_site_settings` — public-safe site configuration and same-tenant media references.
6. `0006_taxonomy` — categories and tags with composite tenant keys.
7. `0007_articles` — articles, workflow checks, same-tenant author/category/media constraints.
8. `0008_article_tags` — composite join-table constraints.
9. `0009_rls` — enable RLS and add policies table by table; fail the migration if any exposed table lacks RLS.
10. `0010_storage` — buckets and storage object policies.
11. `0011_seed_development` — optional generic FACTάκι demo tenant/content only; never production users or credentials.

Generated TypeScript database types follow the migrations and are committed separately from hand-written application domain types.

## Test strategy

Create two sites and at least these users:

```text
Site A: owner_a, admin_a, editor_a, author_a
Site B: owner_b, editor_b, author_b
outsider: authenticated with no membership
anonymous
```

Tests run against direct Supabase REST/SQL behavior, not merely hidden UI controls.

Required assertions:

1. Anonymous can resolve Site A only when active/public and can read only its published articles and public settings.
2. Anonymous cannot read drafts, memberships, private media metadata, or private Storage objects.
3. `author_a` cannot read or mutate unpublished Site B data even after replacing every request `site_id` with Site B.
4. `author_a` can create an Article A draft only as self, edit own draft, and submit it for review.
5. `author_a` cannot publish, schedule, reassign authorship, change settings, or add a cross-tenant category/tag/media reference.
6. `editor_a` can review/publish Site A articles but cannot read or mutate Site B unpublished content.
7. `admin_a` can manage non-owner members and settings but cannot remove/demote the final active owner.
8. Ownership transfer is atomic under concurrent requests and always leaves at least one active owner.
9. Cross-tenant composite foreign keys reject category, author, tag, and media mismatches even with elevated test setup.
10. Article block validation rejects duplicate IDs, unsafe URLs, malformed tables/galleries, unsupported writes, and mismatched schema versions.
11. The public renderer does not crash on an unknown stored block and displays the safe fallback.
12. Storage policies reject wrong-site prefixes, unauthorized roles, draft-public reads, invalid promotion, and deletion of published assets.
13. Service-role tests run only in trusted test setup and prove that no service credential is present in the built browser bundle.

## Deferred after MVP

- pre-account email invitations
- article revisions and rollback UI
- scheduled publishing worker
- comments, newsletter, analytics
- AI drafting agents
- commerce
- automated unused-media garbage collection

The database model intentionally permits these additions without creating per-blog tables or repositories.

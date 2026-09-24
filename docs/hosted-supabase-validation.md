# Hosted Supabase validation

This checklist is intentionally hosted-only. It does not start, reset or depend on a local Supabase database.

## Before applying migrations

- Keep `VITE_DATA_SOURCE=mock`; do not point a public deployment at the new project.
- Create a fresh hosted Supabase project for this blog.
- Use only the project URL and publishable key in `VITE_*` variables. Never expose a secret or service-role key.
- Link the repository to the intended project and review `bunx supabase db push --dry-run` before `bunx supabase db push`.
- Never run `db reset --linked` against a project containing data.

## Baseline verification

- Confirm migrations `20260921132001` through `20260921132010` are recorded as applied.
- Confirm RLS is enabled on `profiles`, `members`, `media_assets`, `site_settings`, `categories`, `tags`, `articles` and `article_tags`.
- Confirm `site_settings` contains exactly one row.
- Confirm the eight configured categories exist with their expected normalized slugs.
- Confirm `blog-private` is private and `blog-public` is public.
- Confirm no users, members, article content or credentials were seeded.

## Auth and role verification

Run these checks only after cookie-based SSR auth and the admin guard are implemented.

- Create the first user through Supabase Auth and confirm the profile trigger creates one matching `profiles` row.
- As that authenticated user, call `claim_initial_owner()` once and confirm an active owner membership is created.
- Confirm a second claim fails.
- Confirm the final active owner cannot be suspended, demoted or deleted.
- Confirm an anonymous request cannot enter the admin flow.

## RLS matrix

Use temporary hosted test users for each role and remove or suspend them after validation.

- Anonymous: reads published articles, public taxonomy/settings and public media metadata only.
- Anonymous: cannot read drafts, members or private media metadata.
- Author: creates drafts as self and edits only own drafts/reviews.
- Author: cannot reassign authorship, publish, schedule, set editorial flags, manage members or update settings.
- Editor: manages editorial content and taxonomy but not members or site settings.
- Admin: manages non-owner members and site settings but cannot manage an owner.
- Owner: has the intended administrative scope while last-owner protection remains enforced.

## Storage matrix

- Anonymous public URLs serve objects from `blog-public`.
- Anonymous and unrelated members cannot retrieve `blog-private` objects.
- Active members can upload only to allowed top-level folders.
- Authors can manage their own private uploads but cannot promote public assets directly.
- Editor, admin and owner promotion/deletion follows the intended policy.
- Invalid traversal-style paths and unsupported folders are rejected.

## Application cutover gate

Do not set `VITE_DATA_SOURCE=supabase` in a public deployment until all of the following exist and pass:

- request-scoped server client and separate browser client;
- cookie-based session refresh;
- login/logout and `/admin` membership guard;
- article/tag persistence;
- media upload, metadata and publication workflow;
- hosted RLS and Storage checks above;
- confirmation that no service credential appears in the browser bundle.

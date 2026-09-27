# FACTάκι

A reusable editorial blog built with React, TanStack Start, Tailwind CSS and an optional Supabase data source.

## Development

Install [Bun](https://bun.sh), then run:

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
bun run dev
```

## Supabase setup

The repository contains a version-controlled Supabase baseline for one independent blog. A new blog gets its own repository and hosted Supabase project, then applies the same migrations from `supabase/migrations`.

The baseline enables RLS in the same migration that creates each table and seeds only public, non-secret FACTάκι settings plus the eight initial categories. It never seeds users, credentials or article content.

Nothing in the repository applies migrations automatically. No local database setup is required. Copy `.env.example` to `.env.local` only after a hosted project has been created, and never place secret/service-role credentials in a `VITE_*` variable.

Article reads and writes use a shared repository contract. The default `VITE_DATA_SOURCE=mock` keeps the application entirely on demo data. The Supabase adapter is activated only when `VITE_DATA_SOURCE=supabase` is set together with a hosted project URL and publishable key.

## Architecture

The app never talks to a database directly. Every read and write goes through repository interfaces, so the same pages run on demo data today and on Supabase later without changes.

| Layer                                                  | Folder                       | Knows about the database? |
| ------------------------------------------------------ | ---------------------------- | ------------------------- |
| Domain types, validation, role rules                   | `src/domain`, `src/lib`      | No                        |
| Repository contracts                                   | `src/data/*/…-repository.ts` | No                        |
| Mock adapter (in-memory tables shaped like the schema) | `src/data/mock`              | No                        |
| Supabase adapter                                       | `src/data/supabase`          | Yes — the only place      |
| Adapter selection (one function)                       | `src/server/repositories.ts` | Picks one                 |
| Server functions called by pages                       | `src/functions`              | No                        |

Mock mode mirrors the database rules (unique slugs, one fact of the day, author vs editor permissions, `on delete set null` for categories), and the tests in `src/data/mock` pin that behaviour so the Supabase adapter can be checked against the same expectations.

Public URLs: `/arthro/<slug>`, `/katigoria/<slug>`, `/etiketa/<slug>`, `/syntaktis/<slug>`. Slugs are Latin; Greek titles and names are transliterated (`src/lib/slug.ts`).

## Authentication

All data access runs on the server through TanStack Start server functions (`src/functions`). Each request gets its own Supabase client (`src/server/supabase.ts`) that reads and refreshes the session from HTTP-only cookies, so RLS always sees the correct user. `/admin` redirects to `/login` unless the visitor is an active member; server functions check membership again, and RLS remains the final security boundary.

Blogs are invite-only. Before anyone can reach the project:

1. In the Supabase dashboard, open **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**.
2. Create the owner under **Authentication → Users → Add user** (auto-confirm the email).
3. In the **SQL editor**, run once: `select private.bootstrap_owner('owner@example.com');`

The bootstrap runs only as the database owner, is concurrency-safe, and refuses to run once any member exists.

In mock mode there are no accounts. The admin is open during `bun run dev`; a deployed demo keeps it closed unless `VITE_ENABLE_DEMO_ADMIN=true` is set.

When a fresh hosted project is available:

```sh
bunx supabase login
bunx supabase link --project-ref <project-ref>
bunx supabase db push --dry-run
bunx supabase db push
```

Always review the dry run before applying changes. Do not run `db reset --linked` against production; it deletes remote data before replaying migrations.

After the first push, follow `docs/hosted-supabase-validation.md` before enabling `VITE_DATA_SOURCE=supabase`. Authentication, SSR cookie sessions and live RLS/Storage verification remain required before the admin can be used against Supabase.

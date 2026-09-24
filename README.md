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

To initialize the first owner, create/sign in a user and call the one-time `claim_initial_owner()` RPC. The call is concurrency-safe and stops working as soon as the first membership exists.

When a fresh hosted project is available:

```sh
bunx supabase login
bunx supabase link --project-ref <project-ref>
bunx supabase db push --dry-run
bunx supabase db push
```

Always review the dry run before applying changes. Do not run `db reset --linked` against production; it deletes remote data before replaying migrations.

After the first push, follow `docs/hosted-supabase-validation.md` before enabling `VITE_DATA_SOURCE=supabase`. Authentication, SSR cookie sessions and live RLS/Storage verification remain required before the admin can be used against Supabase.

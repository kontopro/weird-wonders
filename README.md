# Weird Wonders

Just the design and prototypes for a "Ήξερες ότι..?" site, meaning a site/blog for weird stories!

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9b721cee-c538-4a62-94a3-3cc38d6fac5e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Supabase setup

The repository contains a version-controlled Supabase baseline for one independent blog. A new blog gets its own repository and hosted Supabase project, then applies the same migrations from `supabase/migrations`.

Nothing in the repository applies migrations automatically. No local database setup is required. Copy `.env.example` to `.env.local` only after a hosted project has been created, and never place secret/service-role credentials in a `VITE_*` variable.

To initialize the first owner, create/sign in a user and call the one-time `claim_initial_owner()` RPC. The call is concurrency-safe and stops working as soon as the first membership exists.

When a fresh hosted project is available:

```sh
bunx supabase login
bunx supabase link --project-ref <project-ref>
bunx supabase db push --dry-run
bunx supabase db push
```

Always review the dry run before applying changes. Do not run `db reset --linked` against production; it deletes remote data before replaying migrations.

# Handover: FACTάκι / reusable blog

Read this first. It is the working brief for any agent (Claude Code, Codex, Cursor…) or developer picking up this repository. `README.md` is the user-facing manual; this file is how to work on the code without breaking its rules. Last updated: 2026-09-28.

## What this is

A **reusable blog/site starter**: each new site gets its own copy of this repository plus its own fresh Supabase project, and applies the migrations in `supabase/migrations`. There are categories, tags, authors/editors, and a team with roles. The current instance is **FACTάκι** (Greek "facts" magazine, domain `factaki.gr`, main language Greek, English as a second language). The owner will later extract a neutral starter from it themselves; do not do that unasked.

- Repository: GitHub `kontopro/weird-wonders`, default branch `main`. Deployed on Vercel.
- Stack: TanStack Start 1.168 (React 19, file routes, server functions), Vite 8, Nitro, Tailwind 4, Bun 1.3 (package manager, unit tests), Node 22 (runs the built server), Zod 4, Supabase (Postgres, Auth, Storage) via `@supabase/ssr`, Playwright for browser tests.

## Status

**Done, all on `main`, tested and in CI:**

- public site: home, articles, categories, tags, authors, Discover search (accent-insensitive), popular, pagination, old-URL 301s, view counts
- two languages with translated URLs (`/arthro/…`, `/en/article/…`)
- admin: articles and editor, media library with responsive image copies, categories and tags with translations, team (invites, roles, suspension), newsletter subscribers
- SEO: sitemap with hreflang, robots.txt, RSS per language, Open Graph and JSON-LD
- newsletter double opt-in through Resend, or a demo outbox
- security: RLS on everything, CSP and other headers, rate limits, upload sniffing. Two independent reviews were fixed.
- CI (GitHub Actions) and Dependabot

**The hosted Supabase project exists** (free plan). On 2026-09-28 the eight migrations and the seed were pushed and the baseline checks passed (RLS on every table, visitor functions, buckets, categories, no seeded users). Sign-ups are off and the first owner is bootstrapped. The app now runs against it locally (`bun run dev` with `.env.local`), signed in as the owner. **Verified on Supabase:** sign-in and the admin guard; every admin page; writing, saving, publishing and deleting articles (blocks, sources, tags, category); cover upload to Storage with the 480/960/1440 copies; an English version with hreflang; category and tag translations; slug change with a 301; search, category, tag, author, popular pages, RSS and sitemap; view counts; the newsletter sign-up, confirmation and erasure. Two bugs were fixed: an ambiguous `members → profiles` embed (PGRST201) and `<img src="">` on articles without a cover. The site holds one real article (the trees fact, el + en).

**Next steps, in order:**

1. **Hosted Supabase project.** The owner skipped a local (Docker) Supabase: the site is not in production yet, so the adapters are exercised directly on a hosted project. Then:
   - ~~create and link the project, fill `.env.local`, push the migrations and the seed~~ (done)
   - ~~sign-ups off, first owner, run the app on Supabase~~ (done)
   - still to check from `docs/hosted-supabase-validation.md`: other roles (invite an editor and an author; needs SMTP, see below) and the RLS/Storage matrices with them; deleting an image and its copies; an image in use cannot be deleted
   - set the Vercel env vars (below)

   The free plan's built-in e-mail sends only a few messages an hour, to the Supabase organisation's own members, so invites to others need custom SMTP (Resend offers SMTP; step 2).

   The Playwright suite targets mock mode; a Supabase variant should run against a separate test project, never the site's own.

2. **Resend.** Verify the domain, then set `RESEND_API_KEY` and `EMAIL_FROM`.
3. **Later / optional:**
   - sending newsletter issues to the list (not built)
   - a shared store for rate limits (Upstash)
   - CSP nonces
   - the app / PWA (deferred by the owner)
   - the neutral starter extraction (the owner does it)

## Commands

```sh
bun install
bun run dev            # http://localhost:8080, mock data; demo admin at /login (pick a person)
bun run check          # prettier --check, eslint, tsc --noEmit, bun test (unit + database)
bun run test:e2e       # builds with demo data, serves on :4173, Playwright (Chromium)
bunx playwright install chromium   # once per machine
bun run build          # production build (.output/), run it with: node .output/server/index.mjs
```

`bun test` also applies all migrations to an in-process Postgres (PGlite) and checks RLS per role: `supabase/tests`. Run `bun run check` before every commit; CI runs the same, plus the browser tests and `bun audit --audit-level=high`.

## Architecture map

| Path                             | What                                                                                                                                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/`                    | File routes. Public pages under `{-$lang}/` (optional language prefix). Admin: `admin.*.tsx`. Server routes: `sitemap[.]xml.ts`, `robots[.]txt.ts`, `{-$lang}/rss[.]xml.ts`, `media.demo.$id.ts`. See `src/routes/README.md`. `routeTree.gen.ts` is generated; never edit it. |
| `src/functions/`                 | Server functions (`createServerFn`), the only API the browser calls. Every one validates input with Zod and checks roles with `requireMember(...)`.                                                                                                                           |
| `src/data/<area>/`               | Repository **interfaces** plus `index.ts` (isomorphic `xxxApi` wrappers around the server functions).                                                                                                                                                                         |
| `src/data/mock/`                 | In-memory adapters plus demo seed (`demo-seed.ts`); the store mirrors the DB tables.                                                                                                                                                                                          |
| `src/data/supabase/`             | Supabase adapters (dormant until step 1).                                                                                                                                                                                                                                     |
| `src/data/email/`                | `EmailSender`: Resend adapter, and a demo outbox.                                                                                                                                                                                                                             |
| `src/server/repositories.ts`     | **The single place that picks adapters** (mock or Supabase, email sender, auth provider).                                                                                                                                                                                     |
| `src/server/`                    | Also session auth (`auth.ts`), Supabase clients, feeds, rate limits, security headers, newsletter e-mail.                                                                                                                                                                     |
| `src/domain/`                    | Business rules shared by both adapters and mirrored in SQL: statuses/publishing, permissions, team rules, taxonomy, listing/search, media, newsletter.                                                                                                                        |
| `src/config/site.ts`             | Site identity: name, domain, languages, main language, and `siteUrl` (from `VITE_SITE_URL`).                                                                                                                                                                                  |
| `src/config/messages/{el,en}.ts` | **Every public word per language**, including URL path words.                                                                                                                                                                                                                 |
| `src/i18n/`                      | Language helpers: localized paths and router rewrite, hreflang, `socialMeta`, JSON-LD.                                                                                                                                                                                        |
| `src/components/`                | UI. `components/ui/` is vendored shadcn/ui: keep it as upstream ships it (some lint rules are off there).                                                                                                                                                                     |
| `src/emails/`                    | E-mail templates (HTML + text).                                                                                                                                                                                                                                               |
| `supabase/migrations/`           | Eight baseline SQL files (foundation, people, media, taxonomy, articles, access policies, storage, reader features).                                                                                                                                                          |
| `supabase/seed.sql`              | Categories and their English names.                                                                                                                                                                                                                                           |
| `supabase/tests/`                | PGlite schema tests plus `supabase-shim.sql`, which imitates Supabase roles, `auth.uid()`, storage and **Supabase's default grants**.                                                                                                                                         |
| `e2e/`                           | Playwright tests plus `serve.ts`, which always builds in mock mode.                                                                                                                                                                                                           |
| `docs/`                          | `supabase-mvp-design.md` (schema design), `hosted-supabase-validation.md` (go-live checklist).                                                                                                                                                                                |
| `.github/`                       | CI workflow and Dependabot.                                                                                                                                                                                                                                                   |

## Rules that must hold

- **Database independence.** Pages and components call only `src/data/*/index.ts`, never Supabase. A new feature means: an interface method, then the mock adapter **and** the Supabase adapter, then a server function. Business rules go in `src/domain` and are mirrored in SQL/RLS; the mock mirrors the database rules.
- **Migrations.** The baseline is applied to the hosted project, but the site is not in production, so until the owner declares the schema stable it is still **edited in place**: fix the baseline files and reset the hosted database (`bunx supabase db reset --linked`, which deletes its data), **asking the owner before every reset**. **Once the owner declares it stable, never edit applied migrations; add new ones.** Every table has RLS enabled in the migration that creates it. `security definer` functions use `set search_path = ''`.
- **Grants.** Supabase grants every new function and table in `public` to `anon`/`authenticated` by default. Always `revoke ... from public, anon, authenticated` explicitly, then grant what is intended. A schema test lists the only functions visitors may call; update it deliberately.
- **Server-only secrets.** `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` and `EMAIL_FROM` are never prefixed `VITE_` and never logged. The service-role client (`src/server/supabase-admin.ts`) is used only after authorization, and only for:
  - Auth admin (invites)
  - `claim_newsletter_confirmation`
  - `record_article_view`
- **Errors.** Expected failures throw `DomainError` (`src/domain/errors.ts`), whose message is shown to the user. Anything else is logged, and the browser gets a generic message (function middleware in `src/start.ts`). Use `errorMessage()` in UI code.
- **Validation.** Zod at every server-function boundary. `exactOptionalPropertyTypes` is on, so strip `undefined` keys before passing objects on.
- **i18n.** No hard-coded public text: add keys to both `messages/el.ts` and `en.ts`. Public URLs use each language's path words. The main language has no prefix, and `/el/...` redirects. The admin UI is Greek only.
- **Security headers** come from `src/server/security-headers.ts`, production only. A new external host (images, embeds, scripts) must be added to the CSP there. The browser tests fail on any console CSP violation.
- **Public actions are rate-limited** (`src/server/rate-limit.ts`). New public write endpoints need a limit.
- **Demo mode** (`VITE_DATA_SOURCE=mock`): the admin is open to anyone; e-mails are never sent; newsletter sign-ups accept only `@example.com`. Keep it that way.

## Environment variables

See `.env.example`.

| Variable                                             | Where       | Purpose                                                                                    |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `VITE_DATA_SOURCE`                                   | build       | `mock` (default) or `supabase`                                                             |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | build       | Supabase client                                                                            |
| `VITE_SITE_URL`                                      | build       | Public origin for canonical, hreflang, sitemap, RSS, OG. Defaults to `https://factaki.gr`. |
| `VITE_ENABLE_DEMO_ADMIN`                             | build       | Open the demo admin on a deployed mock site                                                |
| `SUPABASE_SECRET_KEY`                                | server only | Invites, confirmation e-mails, view counts. Needed in production.                          |
| `RESEND_API_KEY`, `EMAIL_FROM`                       | server only | Sending e-mail                                                                             |

## Gotchas

- **The owner works on Windows.** Scripts must be cross-platform (see `e2e/serve.ts`, which uses `shell` on win32).
- **Bun cannot run the built server** (a parse error in the router bundle). Run `.output/server/index.mjs` with **Node**.
- **Build before type-checking new routes.** `tsc` sees new routes only after `routeTree.gen.ts` is regenerated, which `vite dev` or `vite build` does.
- **`bunfig.toml` has `minimumReleaseAge = 86400`.** Packages published less than a day ago will not install. That is intended (supply-chain guard).
- **Dependabot ignores some major versions** until their ecosystem is ready: `typescript` (typescript-eslint does not support TS 7 yet), `recharts` (upgrade with the first real chart), `@types/node` (keep it equal to the Node version in CI and on Vercel, currently 22). Test other major updates locally before merging.
- **Playwright's browser must match its version.** In locked-down sandboxes, point `launchOptions.executablePath` at an installed Chromium through a temporary config rather than editing `playwright.config.ts`.
- **The PGlite shim is not Supabase.** It does not model storage-api (move, copy, upsert) or PostgREST limits. Verify these on a real Supabase (step 1).
- **Demo seed rows** (`src/data/mock/demo-seed.ts`) mirror the DB schema. When a column is added, add it there and in `MockStore` too.

## Working with the owner

- The owner writes in Greek or English; answer in the same language. Keep reports short and in plain words.
- One branch per change (`feature/...`, `deps/...`, `docs/...`). Commit only after `bun run check` (and `bun run test:e2e` for UI or flow changes) passes.
- Git flow: the agent commits and pushes the feature branch (never `main`) and opens the pull request (with `gh`; without it, the owner opens it from the link `git push` prints). **The owner reviews and merges on GitHub** and deletes the remote branch. When told it is merged, the agent runs `git checkout main`, `git pull`, `git fetch --prune` and `git branch -d <branch>`; if `-d` refuses (e.g. after a squash merge), ask before using `-D`.
- Commit messages: an imperative subject, then a short body explaining why.
- Ask before anything hard to reverse:
  - applying migrations to a hosted project
  - deleting data
  - changing Vercel or Supabase settings
- Never ask for secrets or database passwords in chat.
- `roadmap.md` (Greek) tracks features; tick items there when you finish them. README sections document every feature; keep them current.

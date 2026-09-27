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

The baseline (`supabase/migrations`, seven files) builds the structure only and enables RLS in the same migration that creates each table. A blog's own starting data — its categories — lives in `supabase/seed.sql`. Nothing seeds users, credentials or article content. The site's identity (name, SEO, labels) lives in `src/config/site.ts`.

`bun test` also applies the migrations to an in-process Postgres (PGlite) and checks the access rules per role (`supabase/tests`), so the schema is tested without a Supabase project.

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

Authentication sits behind the `AuthProvider` interface (`src/data/auth/auth-provider.ts`), just like data sits behind the repositories. `src/server/repositories.ts` is the only place that picks the adapters:

- **Mock mode** (`MockAuthProvider`): sign in as one of the seeded demo members (owner, editor, author) to try every role without a database. There are no passwords, so it is available only in `bun run dev`, or on a deployed demo when `VITE_ENABLE_DEMO_ADMIN=true` is set.
- **Supabase mode** (`SupabaseAuthProvider`): email and password. Each request gets its own Supabase client (`src/server/supabase.ts`) that reads and refreshes the session from HTTP-only cookies, so RLS always sees the correct user.

All data access runs on the server through TanStack Start server functions (`src/functions`). `/admin` redirects to `/login` unless the visitor is an active member; server functions check membership and role again, and in Supabase mode RLS remains the final security boundary. A new backend needs only a new `AuthProvider` and repository adapters.

### Supabase: first owner

Blogs are invite-only. Before anyone can reach the project:

1. In the Supabase dashboard, open **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**.
2. Create the owner under **Authentication → Users → Add user** (auto-confirm the email).
3. In the **SQL editor**, run once: `select private.bootstrap_owner('owner@example.com');`

The bootstrap runs only as the database owner, is concurrency-safe, and refuses to run once any member exists.

## Writing articles

The editor builds articles from blocks (paragraph, heading, list, quote, image, gallery, table, fact box, scorecard, video/embed, divider, call to action):

- **Text formatting:** `**bold**`, `*italic*` and `[links](https://…)` via the toolbar or Ctrl+B / Ctrl+I / Ctrl+K. It is rendered safely (never as HTML); unsafe links stay plain text.
- **Pasting** several paragraphs into a paragraph block creates one block per paragraph.
- **Images** come from the media library (`/admin/media`): upload once, reuse anywhere. Uploads are resized to at most 2000 px and converted to WebP in the browser; alt text is required. Images only (no SVG), up to 10 MB.
- **Sources** are structured (title, link, publisher, date) and shown under the article.
- **YouTube/Vimeo** embeds load only when the reader presses play.

In mock mode uploads live in server memory until restart; with Supabase they go to the `blog-public` Storage bucket (`media/<uploader>/…`). Uploaded images are reachable by URL, as in most CMSs.

## Languages

A blog has a **main language** and may publish in others (`src/config/site.ts`: `defaultLanguage`, `languages`). FACTάκι publishes in Greek (main) and English.

- **Words:** everything the public site says — menus, labels, SEO text, the About page and the URL words — lives in one file per language: `src/config/messages/el.ts`, `en.ts`. To add a language, copy a file, translate it, register it in `src/config/messages/index.ts` and add the code to `languages`. The admin stays in the main language.
- **URLs:** the main language has no prefix (`/arthro/…`); other languages are prefixed and use their own words (`/en/article/…`, `/en/category/…`). Routes are defined once; the router rewrite in `src/router.tsx` translates the words (`src/i18n/paths.ts`). `/el/…` redirects to the unprefixed URL.
- **Articles:** each version is its own article in a translation group, with its own slug, SEO and status. In the editor, a saved article's **Γλώσσες** panel creates a linked draft in another language (content, cover, category and tags are copied) for translating. New articles can pick their language.
- **Public pages** link to the other published versions and emit `hreflang`, `x-default`, canonical and `og:locale`.
- **Categories and tags** are named in the main language; translations (name, slug, description) are edited on `/admin/categories` and `/admin/tags`. Pages fall back to the main-language name when a translation is missing. The admin always shows main-language names so tags are never duplicated.

## Reader features

- **Search** (`/anakalypse?q=…`): accent- and case-insensitive, matches the start of words ("δεντρ" finds "Δέντρα") across title, excerpt and article text. In Supabase it is a ranked full-text search (`unaccent` + GIN index); mock mode applies the same rule in memory.
- **Pagination:** Discover, category, tag and author pages show 12 articles per page (`?page=2`).
- **Old addresses:** changing the slug of a published article keeps the old address working with a permanent (301) redirect.
- **Views:** each article page counts one view per browser session. Only daily totals per article are stored — no visitor data. "Popular" means most viewed in the last 30 days; the admin shows all-time views.
- **Newsletter:** the homepage form stores sign-ups with language and consent time (silently idempotent, so it cannot reveal who is subscribed). Owners and admins see the list at `/admin/subscribers`, export it as CSV and erase entries. Confirm/unsubscribe links (`/newsletter?action=confirm|unsubscribe&token=…`) work; **sending e-mails needs an e-mail provider** (e.g. Resend), which is not connected yet.

## Team

Owners and admins manage the team at `/admin/team`: invite members, change roles, suspend and reactivate, and remove members without articles (members with articles are suspended instead, so their bylines stay). Admins cannot create or change owners, nobody changes their own membership there, and the team always keeps an active owner. The same rules live in `src/domain/team.ts` and in the database.

In mock mode an invited member is added immediately and appears among the demo accounts. With Supabase:

1. Set `SUPABASE_SECRET_KEY` on the server (Vercel: _Settings → Environment Variables_). It is server-only — never prefix it with `VITE_`. Without it, invites are disabled and the team list shows no e-mails.
2. Under **Authentication → URL Configuration**, set the **Site URL** to the blog's address.
3. Under **Authentication → Emails → Invite user**, make the link point to the app:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin/password`

The invited person opens the link, is signed in by `/auth/confirm`, and sets a password at `/admin/password`.

When a fresh hosted project is available:

```sh
bunx supabase login
bunx supabase link --project-ref <project-ref>
bunx supabase db push --dry-run
bunx supabase db push --include-seed
```

Always review the dry run before applying changes. Do not run `db reset --linked` against production; it deletes remote data before replaying migrations.

After the first push, follow `docs/hosted-supabase-validation.md` before enabling `VITE_DATA_SOURCE=supabase`. Authentication, SSR cookie sessions and live RLS/Storage verification remain required before the admin can be used against Supabase.

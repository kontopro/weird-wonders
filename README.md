# FACTάκι

A reusable editorial blog built with React, TanStack Start, Tailwind CSS and an optional Supabase data source.

## Development

Working on the code (people or AI agents): start with [`CLAUDE.md`](CLAUDE.md), the handover brief — status, next steps, architecture and the rules the code keeps.

Install [Bun](https://bun.sh), then run:

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
bun run dev
```

## Checks

`bun run check` runs formatting, lint, the type check and the unit tests (schema tests included). GitHub runs it on every pull request and push to `main`, together with the browser tests below (`.github/workflows/ci.yml`); a red check on a pull request means something broke. Failed browser tests attach their screenshots and traces to the run (_Artifacts_).

To block merging while checks fail: GitHub → _Settings → Branches → Add rule_ for `main` → _Require status checks to pass_ and pick both CI jobs.

## Security

- **Access rules live in the database** (RLS on every table, storage policies, `security definer` functions with a fixed `search_path`); the app checks roles again in every server function. `supabase/tests` checks them per role — including that visitors can call only the intended functions, with Supabase's default grants reproduced in the test database.
- **Headers:** production responses send a Content-Security-Policy, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS (`src/server/security-headers.ts`). Scripts may run inline (the framework needs it); everything else is limited to this site, Supabase Storage and the two video players.
- **Limits** (`src/server/rate-limit.ts`): failed sign-ins per visitor and per account, newsletter sign-ups and links, and view counting (one view per article per visitor every 30 minutes). They count per server instance; for a busy site back them with a shared store (e.g. Upstash). The database caps confirmation e-mails per address and per hour.
- **Server-only secret key:** `SUPABASE_SECRET_KEY` is needed in production for invitations, newsletter confirmation e-mails and view counts (visitors cannot call those database functions directly).
- **Uploads** are typed by their contents; SVG is refused.
- **Errors:** unexpected server errors reach the browser as a generic message; details stay in the server log.
- **Demo mode** never sends e-mails and accepts only `@example.com` newsletter addresses, because its admin is open to everyone.
- **In the Supabase dashboard** (hosted projects do not read `config.toml`): turn off sign-ups, turn on e-mail confirmations and _Secure password change_ (Authentication → Providers → Email).
- **Known limits:** inline scripts are allowed by the CSP (nonces would need framework support); rate limits are per instance; the confirmation e-mail is sent during the sign-up request.

## Browser tests

`bun run test:e2e` builds the site with demo data and the demo admin (`e2e/serve.ts`, never Supabase), starts it on port 4173 and drives a real Chromium through the public site and the admin: publishing an article with an uploaded cover, its responsive copies, feeds, a translation draft, the article list filters, role limits and team invitations. Any browser console error fails a test. It needs Node.js for the built server.

First time on a machine: `bunx playwright install chromium`. Failed runs keep a screenshot and a trace in `test-results/` (`bunx playwright show-trace <file>`).

## Supabase setup

The repository contains a version-controlled Supabase baseline for one independent blog. A new blog gets its own repository and hosted Supabase project, then applies the same migrations from `supabase/migrations`.

The baseline (`supabase/migrations`, eight files) builds the structure only and enables RLS in the same migration that creates each table. A blog's own starting data — its categories — lives in `supabase/seed.sql`. Nothing seeds users, credentials or article content. The site's identity (name, SEO, labels) lives in `src/config/site.ts`.

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
- **Public pages** link to the other published versions and emit `hreflang`, `x-default`, canonical and `og:locale` (see _Search engines and sharing_).
- **Categories and tags** are named in the main language; translations (name, slug, description) are edited on `/admin/categories` and `/admin/tags`. Pages fall back to the main-language name when a translation is missing. The admin always shows main-language names so tags are never duplicated.

## Reader features

- **Search** (`/anakalypse?q=…`): accent- and case-insensitive, matches the start of words ("δεντρ" finds "Δέντρα") across title, excerpt and article text. In Supabase it is a ranked full-text search (`unaccent` + GIN index); mock mode applies the same rule in memory.
- **Pagination:** Discover, category, tag and author pages show 12 articles per page (`?page=2`).
- **Old addresses:** changing the slug of a published article keeps the old address working with a permanent (301) redirect.
- **Views:** each article page counts one view per page load (nothing is stored on the visitor's device). Only daily totals per article are stored — no visitor data. "Popular" means most viewed in the last 30 days; the admin shows all-time views.
- **Newsletter (double opt-in):** the homepage form stores sign-ups with language and consent time (silently idempotent, so it cannot reveal who is subscribed) and e-mails a confirmation link in the reader's language (`src/emails/`). The address counts only after the reader opens the link _and_ presses the button (mail scanners open links on their own). At most one confirmation e-mail per address every 10 minutes, so the form cannot flood an inbox. Owners and admins see the list at `/admin/subscribers`, export it as CSV and erase entries.
- **E-mail:** set `RESEND_API_KEY` and `EMAIL_FROM` on the server (Vercel env; never `VITE_`) after verifying the sender domain in Resend, and optionally `EMAIL_REPLY_TO` (comma-separated) for where answers go. Every address is a setting, so changing it needs no code change (see `docs/handover.md`). With Supabase it also needs `SUPABASE_SECRET_KEY` (only the server may read confirmation tokens). In mock mode nothing is sent: the e-mails appear at `/admin/subscribers`, links included. Other providers: implement `EmailSender` (`src/data/email/`). Sending newsletter _issues_ to the list is not built yet.

## Search engines and sharing

Set `VITE_SITE_URL` to the deployment's public address (e.g. `https://factaki.gr`; defaults to `https://<siteConfig.domain>`). Every absolute link below uses it.

- **`/sitemap.xml`:** home and list pages, published articles, categories and tags with articles, and authors — every language version with its `hreflang` alternates and `lastmod`. Drafts and scheduled-but-not-yet-public articles never appear. Submit it once in Google Search Console and Bing Webmaster Tools.
- **`/robots.txt`:** generated; keeps `/admin`, `/login` and `/auth/` out and points to the sitemap.
- **RSS:** `/rss.xml` (main language) and `/en/rss.xml` carry the latest 20 articles; every page links its feed.
- **Social previews:** each public page sets Open Graph and X/Twitter tags. Articles use their cover; other pages use the language's share image (`public/og-default.png`, `og-default-en.png`, 1200×630 — replace them for a new blog, set in `messages.<lang>.site.shareImage`).
- **Structured data (JSON-LD):** `Article` + `BreadcrumbList` on articles, `WebSite` with site search on the home page, `BreadcrumbList` on categories, `ProfilePage` on authors. Dates are `<time datetime>` elements.
- **Icons:** `favicon.ico`, `icon-192.png`, `icon-512.png` (also the publisher logo) and `apple-touch-icon.png` in `public/`.

## Speed and accessibility

- **Responsive images:** uploads get smaller WebP copies (480, 960 and 1440 px wide, `imageVariantWidths` in `src/domain/media.ts`), stored next to the original (`media_assets.variants`). Pages send `srcset` + `sizes` (`src/lib/image-sizes.ts`), so phones download a fraction of the full image; the lead image loads with high priority.
- **Fonts are self-hosted** (`@fontsource`): no request to Google, nothing to disclose. Manrope covers Greek; Newsreader is Latin-only, so Greek headings use Georgia.
- **Dark mode** follows the system until the reader picks a theme, and is applied before the first paint (no light flash).
- **No cookie banner:** the public site sets no tracking cookies and stores only what the reader asks for (theme, bookmarks) in their browser. Add a consent banner if you add analytics or ads.
- **Skip link:** the first Tab on every page jumps to the main content.
- The **demo notice** on articles appears only in mock mode.

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

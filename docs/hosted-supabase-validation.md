# Hosted Supabase validation

This checklist is intentionally hosted-only. It does not start, reset or depend on a local Supabase database.

## Before applying migrations

- Keep `VITE_DATA_SOURCE=mock`; do not point a public deployment at the new project.
- Create a fresh hosted Supabase project for this blog.
- Use only the project URL and publishable key in `VITE_*` variables. Never expose a secret or service-role key.
- Link the repository to the intended project and review `bunx supabase db push --dry-run` before `bunx supabase db push --include-seed`.
- Run `bun test` first: it applies the same migrations to an in-process Postgres and checks the access rules.
- Never run `db reset --linked` against a project containing data.

## Baseline verification

- Confirm migrations `20260927170001` through `20260927170008` are recorded as applied.
- Confirm RLS is enabled on `profiles`, `members`, `media_assets`, `categories`, `tags`, `articles` and `article_tags`.
- Confirm both buckets accept only images up to 10 MB.
- Confirm the eight configured categories exist with their expected normalized slugs.
- Confirm `blog-private` is private and `blog-public` is public.
- Confirm no users, members, article content or credentials were seeded.

## Auth and role verification

- Confirm **Allow new users to sign up** is off, and that a sign-up attempt through the API is rejected.
- Create the first user through **Authentication → Users → Add user** and confirm the profile trigger creates one matching `profiles` row.
- In the SQL editor, run `select private.bootstrap_owner('<owner email>');` and confirm an active owner membership is created.
- Confirm a second bootstrap fails, and that `authenticated` cannot execute `private.bootstrap_owner`.
- Sign in at `/login`, confirm the session cookie is HTTP-only, and that `/admin` opens and shows the owner's name and role.
- Sign out and confirm `/admin` redirects to `/login` again.

## Editor and media verification

- As an author, upload an image from the editor's picker; confirm it lands in `blog-public/media/<author id>/` and appears at `/admin/media`.
- Upload a wide image (> 1440 px): confirm the `-w480`, `-w960` and `-w1440` copies land next to it, `media_assets.variants` lists them, and the article page's `<img>` has a `srcset`. Deleting the image removes the copies too.
- Set `VITE_SITE_URL` on Vercel; open `/sitemap.xml`, `/robots.txt` and `/rss.xml` and check the links use the real domain. Paste an article URL into a social preview checker (e.g. the Facebook Sharing Debugger) and Google's Rich Results Test.
- Confirm an author cannot edit or delete an editor's image, and that an image used in an article cannot be deleted.
- Publish an article with a cover, an image block, formatted text and sources; check the public page.

## Reader features verification

- Search Discover for a word without accents (e.g. `δεντρα`) and with a partial word; confirm drafts never appear.
- Change the slug of a published article; confirm the old address redirects (301) to the new one.
- Open an article, reload in a new session and confirm `article_views` counts one view per session; check the popular page.
- Subscribe from the homepage twice with the same address; confirm one row; check `/admin/subscribers` as owner (visible) and editor (not visible); try the confirm and unsubscribe links with the row's token.

## Team verification

- Set `SUPABASE_SECRET_KEY` on the server, the Site URL and the invite e-mail template (see README → Team).
- As the owner, invite an editor and an author from `/admin/team`; confirm both e-mails arrive, the links open `/admin/password`, and each can set a password and sign in.
- As an admin, confirm the role list offers no "owner" and owners cannot be changed.
- Suspend the author and confirm they are sent to `/login` with a "no access" message; reactivate them.
- Confirm a member with articles cannot be removed, only suspended.
- Confirm the final active owner cannot be suspended, demoted or deleted.
- Confirm an anonymous request cannot enter the admin flow.

Account deletion is intentionally explicit: reassign or clear authored articles and uploaded media, remove the membership (without violating last-owner protection), and only then delete the Auth user. The restrictive foreign keys prevent accidental loss of attribution.

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
- Confirm an authenticated upload populates `storage.objects.owner_id` with the uploader's `auth.uid()::text` and that the upload response can read its returned metadata.
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

## Taxonomy and author checks

- Every profile has a unique slug; new sign-ups get an `author-…` slug they can change in the admin profile page.
- As an editor, save an article with a new tag and confirm the tag and link are created by `set_article_tags`.
- As an author, confirm attaching an existing tag works and creating a new tag is refused with a clear message.
- Confirm `/katigoria/<slug>`, `/etiketa/<slug>` and `/syntaktis/<slug>` show only published articles to anonymous visitors.
- Delete a category that has articles and confirm the articles remain, shown as «Χωρίς κατηγορία».

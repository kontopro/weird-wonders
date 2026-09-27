import { describe, expect, test } from "bun:test";

const migrations = [
  ["profiles", "20260921132002_profiles_and_members.sql"],
  ["members", "20260921132002_profiles_and_members.sql"],
  ["media_assets", "20260921132003_media_assets.sql"],
  ["site_settings", "20260921132004_site_settings.sql"],
  ["categories", "20260921132005_taxonomy.sql"],
  ["tags", "20260921132005_taxonomy.sql"],
  ["articles", "20260921132006_articles.sql"],
  ["article_tags", "20260921132007_article_tags.sql"],
] as const;

const migrationFile = (name: string) =>
  Bun.file(new URL(`../../supabase/migrations/${name}`, import.meta.url)).text();

describe("Supabase migration baseline", () => {
  test("enables RLS in the same migration that creates every public table", async () => {
    for (const [table, file] of migrations) {
      const sql = await migrationFile(file);
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  test("keeps the policy migration focused on grants and policies", async () => {
    const sql = await migrationFile("20260921132008_rls.sql");
    expect(sql).not.toContain("enable row level security");
  });

  test("does not seed users, memberships or article content", async () => {
    const sql = await migrationFile("20260921132010_seed.sql");
    expect(sql).not.toMatch(/insert\s+into\s+(?:public\.)?(?:profiles|members|articles)\b/i);
  });

  test("serializes last-owner removal and preserves the first publication timestamp", async () => {
    const membersSql = await migrationFile("20260921132002_profiles_and_members.sql");
    const articlesSql = await migrationFile("20260921132006_articles.sql");

    expect(membersSql).toContain("pg_advisory_xact_lock(hashtext('protect_last_blog_owner'))");
    expect(articlesSql).toContain("new.published_at = old.published_at");
    expect(articlesSql).toContain("check (not is_fact_of_day or status = 'published')");
  });

  test("supports authenticated public-bucket upload responses without anonymous listing", async () => {
    const sql = await migrationFile("20260921132009_storage.sql");
    expect(sql).toContain("create policy storage_public_editor_read");
    expect(sql).toMatch(
      /create policy storage_public_editor_read[\s\S]*for select[\s\S]*to authenticated[\s\S]*bucket_id = 'blog-public'/,
    );
    expect(sql).not.toMatch(/storage_public_editor_read[\s\S]*to anon/);
  });

  test("keeps taxonomy display names unique case-insensitively", async () => {
    const sql = await migrationFile("20260921132005_taxonomy.sql");
    expect(sql).toContain(
      "create unique index categories_name_ci_idx on public.categories (lower(name));",
    );
    expect(sql).toContain("create unique index tags_name_ci_idx on public.tags (lower(name));");
  });

  test("assigns the first owner only through an operator-run bootstrap", async () => {
    const sql = await migrationFile("20260927120000_secure_owner_bootstrap.sql");
    expect(sql).toContain("drop function if exists public.claim_initial_owner();");
    expect(sql).toContain("create or replace function private.bootstrap_owner(owner_email text)");
    expect(sql).toContain(
      "revoke all on function private.bootstrap_owner(text) from public, anon, authenticated;",
    );
    expect(sql).not.toMatch(/grant\s+execute[\s\S]*bootstrap_owner/i);
  });

  test("disables public sign-ups in the reference Supabase config", async () => {
    const config = await Bun.file(new URL("../../supabase/config.toml", import.meta.url)).text();
    expect(config).not.toMatch(/^enable_signup = true$/m);
  });

  test("adds unique, normalized author slugs and an atomic, RLS-respecting tag setter", async () => {
    const sql = await migrationFile("20260927130000_profile_slugs_and_article_tags.sql");
    expect(sql).toContain("add constraint profiles_slug_key unique (slug)");
    expect(sql).toMatch(/set_article_tags[\s\S]*security invoker/);
    expect(sql).toContain("private.can_edit_article(p_article_id)");
    expect(sql).toContain(
      "revoke all on function public.set_article_tags(uuid, jsonb) from public, anon;",
    );
  });
});

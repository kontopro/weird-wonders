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
});

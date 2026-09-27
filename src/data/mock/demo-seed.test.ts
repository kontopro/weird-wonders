import { describe, expect, test } from "bun:test";
import { createDemoStore } from "@/data/mock/demo-seed";
import { isSlug } from "@/lib/slug";

describe("demo seed", () => {
  test("matches the categories seeded into a fresh database", async () => {
    const seedSql = await Bun.file(
      new URL("../../../supabase/migrations/20260921132010_seed.sql", import.meta.url),
    ).text();
    for (const { name, slug, iconKey, sortOrder } of createDemoStore().categories) {
      expect(seedSql).toContain(`('${name}', '${slug}', '${iconKey}', ${sortOrder})`);
    }
  });

  test("uses database-valid slugs and consistent foreign keys", () => {
    const store = createDemoStore();
    const ids = (rows: Array<{ id: string }>) => new Set(rows.map((row) => row.id));
    const categoryIds = ids(store.categories);
    const tagIds = ids(store.tags);
    const profileIds = ids(store.profiles);

    for (const row of [...store.categories, ...store.tags, ...store.profiles, ...store.articles]) {
      expect(isSlug(row.slug)).toBe(true);
    }
    for (const article of store.articles) {
      expect(article.categoryId === null || categoryIds.has(article.categoryId)).toBe(true);
      expect(article.authorId === null || profileIds.has(article.authorId)).toBe(true);
      for (const tagId of article.tagIds) expect(tagIds.has(tagId)).toBe(true);
    }
  });

  test("returns independent copies", () => {
    const first = createDemoStore();
    first.categories.pop();
    expect(createDemoStore().categories).toHaveLength(8);
  });
});

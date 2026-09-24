import { describe, expect, test } from "bun:test";
import { categories, categoryDefinitions, getCategorySlug } from "@/lib/articles";

describe("article taxonomy", () => {
  test("every editor category has a stable normalized database slug", () => {
    expect(categoryDefinitions.map(({ name }) => name)).toEqual(categories);

    for (const category of categories) {
      expect(getCategorySlug(category)).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  test("does not silently invent a slug for an unsupported category", () => {
    expect(getCategorySlug("Άγνωστη κατηγορία")).toBeNull();
  });

  test("the initial hosted-project seed contains every configured category", async () => {
    const seed = await Bun.file(
      new URL("../../supabase/migrations/20260921132010_seed.sql", import.meta.url),
    ).text();

    for (const { name, slug } of categoryDefinitions) {
      expect(seed).toContain(`('${name}', '${slug}'`);
    }
  });
});

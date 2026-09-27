import { beforeEach, describe, expect, test } from "bun:test";
import { createDemoStore } from "@/data/mock/demo-seed";
import { MockArticleRepository } from "@/data/mock/mock-article-repository";
import type { MockStore } from "@/data/mock/mock-store";
import { MockTaxonomyRepository } from "@/data/mock/mock-taxonomy-repository";

let store: MockStore;
let taxonomy: MockTaxonomyRepository;

beforeEach(() => {
  store = createDemoStore();
  taxonomy = new MockTaxonomyRepository(store);
});

describe("MockTaxonomyRepository", () => {
  test("lists categories in display order with published counts", async () => {
    const categories = await taxonomy.listCategories();
    expect(categories.map((category) => category.slug).slice(0, 3)).toEqual([
      "epistimi",
      "istoria",
      "technologia",
    ]);
    // "Επιστήμη" has only a scheduled article, so nothing published yet.
    expect(categories.find((category) => category.slug === "epistimi")?.publishedCount).toBe(0);
    expect(categories.find((category) => category.slug === "fysi")?.publishedCount).toBe(1);
  });

  test("creates, renames and reorders a category", async () => {
    const created = await taxonomy.saveCategory({
      name: "Τέχνη",
      slug: "techni",
      description: "",
      iconKey: "culture",
      sortOrder: 5,
    });
    expect((await taxonomy.listCategories())[0]?.slug).toBe("techni");

    await taxonomy.saveCategory({ ...created, name: "Τέχνες", sortOrder: 500 });
    const categories = await taxonomy.listCategories();
    expect(categories.at(-1)?.name).toBe("Τέχνες");
  });

  test("rejects duplicate slugs and case-insensitive duplicate names", async () => {
    const base = { description: "", iconKey: null, sortOrder: 1 };
    await expect(
      taxonomy.saveCategory({ ...base, name: "Κάτι", slug: "fysi" }),
    ).rejects.toMatchObject({ code: "conflict" });
    await expect(
      taxonomy.saveCategory({ ...base, name: "φύση", slug: "fysi-2" }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  test("deleting a category keeps its articles, uncategorized", async () => {
    const fysi = (await taxonomy.findCategoryBySlug("fysi"))!;
    await taxonomy.deleteCategory(fysi.id);
    const article = await new MockArticleRepository(store).findPublishedBySlug(
      "ta-dentra-epikoinonoun",
    );
    expect(article?.category.name).toBe("Χωρίς κατηγορία");
  });

  test("lists tags alphabetically with published counts", async () => {
    const tags = await taxonomy.listTags();
    expect(tags.map((tag) => tag.name)).toEqual(
      [...tags.map((tag) => tag.name)].sort((a, b) => a.localeCompare(b, "el")),
    );
    expect(tags.find((tag) => tag.slug === "chronos")?.publishedCount).toBe(2);
  });
});

describe("MockTaxonomyRepository — translations", () => {
  test("lists and finds categories by their slug in a language", async () => {
    const repository = new MockTaxonomyRepository(createDemoStore());
    const english = await repository.listCategories("en");
    expect(english.find((item) => item.id === "cat-fysi")).toMatchObject({
      name: "Nature",
      slug: "nature",
      slugsByLanguage: { el: "fysi", en: "nature" },
    });
    expect(await repository.findCategoryBySlug("nature", "en")).not.toBeNull();
    expect(await repository.findCategoryBySlug("nature")).toBeNull();
  });

  test("saves category translations and rejects clashing ones", async () => {
    const repository = new MockTaxonomyRepository(createDemoStore());
    const [science] = await repository.listCategories();
    const saved = await repository.saveCategory({
      id: science!.id,
      name: science!.name,
      slug: science!.slug,
      description: science!.description,
      iconKey: science!.iconKey,
      sortOrder: science!.sortOrder,
      translations: [{ language: "en", name: "Sciences", slug: "sciences", description: "" }],
    });
    expect(saved.translations).toEqual([
      { language: "en", name: "Sciences", slug: "sciences", description: "" },
    ]);
    await expect(
      repository.saveCategory({
        ...saved,
        id: "cat-istoria",
        name: "Ιστορία",
        slug: "istoria",
        translations: [{ language: "en", name: "Other", slug: "sciences", description: "" }],
      }),
    ).rejects.toThrow("ήδη");
  });

  test("saves tag translations used by English tag pages", async () => {
    const repository = new MockTaxonomyRepository(createDemoStore());
    await repository.saveTagTranslations({
      tagId: "tag-mousiki",
      translations: [{ language: "en", name: "music", slug: "music", description: "" }],
    });
    expect((await repository.findTagBySlug("music", "en"))?.id).toBe("tag-mousiki");
  });
});

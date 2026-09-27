import { beforeEach, describe, expect, test } from "bun:test";
import type { ArticleWriteInput, WriteContext } from "@/data/articles/article-repository";
import { createDemoStore, DEMO_USER_ID } from "@/data/mock/demo-seed";
import { MockArticleRepository } from "@/data/mock/mock-article-repository";
import type { MockStore } from "@/data/mock/mock-store";
import { DomainError } from "@/domain/errors";

const editor: WriteContext = { actorId: DEMO_USER_ID, actorRole: "owner" };
const author: WriteContext = { actorId: "author-nikos", actorRole: "author" };

let store: MockStore;
let repository: MockArticleRepository;

beforeEach(() => {
  store = createDemoStore();
  repository = new MockArticleRepository(store);
});

/** The main-language article with this slug, as the admin sees it. */
const adminBySlug = (slug: string) => {
  const row = store.articles.find((item) => item.slug === slug && item.language === "el");
  return row ? repository.findAdminById(row.id) : Promise.resolve(null);
};

const draftInput = (overrides: Partial<ArticleWriteInput> = {}): ArticleWriteInput => ({
  slug: "neo-arthro",
  title: "Νέο άρθρο",
  excerpt: "Περίληψη",
  categorySlug: "epistimi",
  status: "draft",
  dateValue: "2026-09-27",
  content: { version: 1, blocks: [] },
  ...overrides,
});

describe("MockArticleRepository — reading", () => {
  test("lists only published articles, newest first, with category, author and tags", async () => {
    const articles = await repository.listPublished();
    expect(articles.map((article) => article.slug)).toEqual([
      "ta-dentra-epikoinonoun",
      "to-fos-koitazei-parelthon",
      "h-poli-pou-allaxe-hmera",
      "giati-kollaei-to-xasmourito",
      "h-myrwdia-ths-vroxhs",
    ]);
    const first = articles[0]!;
    expect(first.category).toEqual({ slug: "fysi", name: "Φύση", iconKey: "nature" });
    expect(first.author).toEqual({ slug: "maria-papadopoulou", name: "Μαρία Παπαδοπούλου" });
    expect(first.tags).toEqual([{ slug: "oikosystimata", name: "οικοσυστήματα" }]);
  });

  test("filters by category, tag and author slug", async () => {
    const bySlugs = async (filter: Parameters<typeof repository.listPublished>[0]) =>
      (await repository.listPublished(filter)).map((article) => article.slug);

    expect(await bySlugs({ categorySlug: "diastima" })).toEqual(["to-fos-koitazei-parelthon"]);
    expect(await bySlugs({ tagSlug: "chronos" })).toEqual([
      "to-fos-koitazei-parelthon",
      "h-poli-pou-allaxe-hmera",
    ]);
    expect(await bySlugs({ authorSlug: "lida-markou" })).toEqual(["h-poli-pou-allaxe-hmera"]);
    expect(await bySlugs({ tagSlug: "does-not-exist" })).toEqual([]);
  });

  test("never exposes drafts on public reads", async () => {
    expect(await repository.findPublishedBySlug("rologia-kai-ypologistes")).toBeNull();
    expect(await adminBySlug("rologia-kai-ypologistes")).not.toBeNull();
  });
});

describe("MockArticleRepository — writing", () => {
  test("new articles belong to the acting user and resolve or create tags", async () => {
    const saved = await repository.save(
      draftInput({ tags: ["χρόνος", "Νέα ετικέτα", "νέα ετικέτα"] }),
      editor,
    );
    expect(saved.authorId).toBe(DEMO_USER_ID);
    expect(saved.tags).toEqual([
      { slug: "chronos", name: "χρόνος" },
      { slug: "nea-etiketa", name: "Νέα ετικέτα" },
    ]);
    expect(store.tags.filter((tag) => tag.slug === "nea-etiketa")).toHaveLength(1);
  });

  test("publishing an edit updates the public view and keeps the author", async () => {
    const original = (await adminBySlug("rologia-kai-ypologistes"))!;
    await repository.save(
      draftInput({
        id: original.id,
        slug: original.slug,
        title: "Νέος τίτλος",
        categorySlug: original.category.slug,
        status: "published",
      }),
      editor,
    );
    const published = await repository.findPublishedBySlug(original.slug);
    expect(published?.title).toBe("Νέος τίτλος");
    expect(published?.author.slug).toBe("nikos-arvanitis");
  });

  test("rejects a slug that another article already uses", async () => {
    await expect(
      repository.save(draftInput({ slug: "ta-dentra-epikoinonoun" }), editor),
    ).rejects.toBeInstanceOf(DomainError);
  });

  test("rejects an unknown category", async () => {
    await expect(repository.save(draftInput({ categorySlug: "agnosti" }), editor)).rejects.toThrow(
      "Η κατηγορία δεν υπάρχει.",
    );
  });

  test("keeps a single fact of the day", async () => {
    await repository.save(draftInput({ status: "published", isHighlighted: true }), editor);
    await repository.save(
      draftInput({ slug: "allo-arthro", status: "published", isHighlighted: true }),
      editor,
    );
    expect(store.articles.filter((article) => article.isHighlighted)).toHaveLength(1);
  });

  test("rejects a fact-of-day flag on an unpublished article", async () => {
    await expect(repository.save(draftInput({ isHighlighted: true }), editor)).rejects.toThrow();
  });

  test("duplicating creates an independent draft owned by the actor", async () => {
    const copy = await repository.duplicate("1", author);
    expect(copy.status).toBe("draft");
    expect(copy.authorId).toBe(author.actorId);
    expect(copy.isFeatured).toBe(false);
    expect((await adminBySlug("ta-dentra-epikoinonoun"))?.status).toBe("published");
  });
});

describe("MockArticleRepository — author role (mirrors RLS)", () => {
  test("authors can write drafts and submit them for review", async () => {
    const draft = await repository.save(draftInput(), author);
    const submitted = await repository.save(
      draftInput({ id: draft.id, status: "in_review" }),
      author,
    );
    expect(submitted.status).toBe("in_review");
  });

  test("authors cannot publish", async () => {
    await expect(
      repository.save(draftInput({ status: "published" }), author),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  test("authors cannot edit someone else's article", async () => {
    const other = (await adminBySlug("h-siopi-sth-mousiki"))!;
    await expect(
      repository.save(
        draftInput({ id: other.id, slug: other.slug, categorySlug: other.category.slug }),
        author,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  test("authors may use existing tags but not create new ones", async () => {
    const saved = await repository.save(draftInput({ tags: ["χρόνος"] }), author);
    expect(saved.tags.map((tag) => tag.slug)).toEqual(["chronos"]);
    await expect(
      repository.save(draftInput({ slug: "allo", tags: ["ολοκαίνουργια"] }), author),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("MockArticleRepository — scheduled publishing", () => {
  test("keeps a future scheduled article private and shows it as scheduled", async () => {
    const pending = await repository.findPublishedBySlug("treis-kardies-ena-xrwma");
    expect(pending).toBeNull();
    const admin = await adminBySlug("treis-kardies-ena-xrwma");
    expect(admin?.status).toBe("scheduled");
  });

  test("publishes a scheduled article once its day has come", async () => {
    const row = store.articles.find((item) => item.slug === "treis-kardies-ena-xrwma")!;
    row.dateValue = "2020-01-01";
    expect(await repository.findPublishedBySlug(row.slug)).not.toBeNull();
    expect((await adminBySlug(row.slug))?.status).toBe("published");
  });
});

describe("MockArticleRepository — languages", () => {
  test("new articles use the main language; public lists show only that language", async () => {
    const saved = await repository.save(draftInput({ status: "published" }), editor);
    expect(saved.language).toBe("el");

    await repository.save(
      draftInput({
        slug: "trees-talk",
        language: "en",
        translationGroupId: saved.translationGroupId,
        status: "published",
      }),
      editor,
    );
    const greek = await repository.listPublished();
    expect(greek.every((article) => article.language === "el")).toBe(true);
    const english = await repository.listPublished({ language: "en" });
    expect(english.map((article) => article.slug)).toContain("trees-talk");
    expect(english.every((article) => article.language === "en")).toBe(true);
  });

  test("slugs are unique per language and a piece has one version per language", async () => {
    const saved = await repository.save(draftInput(), editor);
    await repository.save(draftInput({ language: "en" }), editor);
    await expect(repository.save(draftInput(), editor)).rejects.toThrow("slug");
    await expect(
      repository.save(
        draftInput({ slug: "other", language: "el", translationGroupId: saved.translationGroupId }),
        editor,
      ),
    ).rejects.toThrow("γλώσσα");
  });
});

describe("MockArticleRepository — translations", () => {
  const treesId = () =>
    store.articles.find((item) => item.slug === "ta-dentra-epikoinonoun" && item.language === "el")!
      .id;

  test("public pages link published versions and show localized category and tags", async () => {
    const greek = await repository.findPublishedBySlug("ta-dentra-epikoinonoun");
    expect(greek?.translations).toEqual([{ language: "en", slug: "trees-talk-to-each-other" }]);
    const english = await repository.findPublishedBySlug("trees-talk-to-each-other", "en");
    expect(english?.category).toMatchObject({ slug: "nature", name: "Nature" });
    expect(english?.tags).toEqual([{ slug: "ecosystems", name: "ecosystems" }]);
    expect(english?.translations).toEqual([{ language: "el", slug: "ta-dentra-epikoinonoun" }]);
  });

  test("the admin always sees main-language category and tag names", async () => {
    const english = store.articles.find((item) => item.slug === "trees-talk-to-each-other")!;
    const editable = await repository.findAdminById(english.id);
    expect(editable?.category.slug).toBe("fysi");
    expect(editable?.tags).toEqual([{ slug: "oikosystimata", name: "οικοσυστήματα" }]);
  });

  test("filters category pages by the slug in their language", async () => {
    const english = await repository.listPublished({ language: "en", categorySlug: "nature" });
    expect(english.map((article) => article.slug)).toEqual(["trees-talk-to-each-other"]);
  });

  test("createTranslation makes a linked draft and refuses duplicates", async () => {
    // Remove the demo English version to start from a Greek-only piece.
    store.articles = store.articles.filter((item) => item.slug !== "trees-talk-to-each-other");
    const draft = await repository.createTranslation(treesId(), "en", author);
    expect(draft).toMatchObject({
      language: "en",
      status: "draft",
      slug: "ta-dentra-epikoinonoun",
    });
    expect(draft.translations.map((version) => version.language)).toEqual(["el"]);
    expect((await repository.findAdminById(treesId()))?.translations[0]?.id).toBe(draft.id);
    await expect(repository.createTranslation(treesId(), "en", author)).rejects.toThrow("γλώσσα");
    await expect(repository.createTranslation(treesId(), "fr", author)).rejects.toThrow();
  });
});

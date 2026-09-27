import { beforeEach, describe, expect, test } from "bun:test";
import type { WriteContext } from "@/data/articles/article-repository";
import { createDemoStore, DEMO_USER_ID } from "@/data/mock/demo-seed";
import { MockArticleRepository } from "@/data/mock/mock-article-repository";
import { MockNewsletterRepository } from "@/data/mock/mock-newsletter-repository";
import type { MockStore } from "@/data/mock/mock-store";

const editor: WriteContext = { actorId: DEMO_USER_ID, actorRole: "owner" };

let store: MockStore;
let articles: MockArticleRepository;

beforeEach(() => {
  store = createDemoStore();
  articles = new MockArticleRepository(store);
});

describe("pagination", () => {
  test("pages cover every public article exactly once", async () => {
    const all = await articles.listPublished();
    const first = await articles.pagePublished({}, 1, 2);
    const second = await articles.pagePublished({}, 2, 2);
    expect(first.total).toBe(all.length);
    expect(first.pageCount).toBe(Math.ceil(all.length / 2));
    expect([...first.items, ...second.items].map((item) => item.slug)).toEqual(
      all.slice(0, 4).map((item) => item.slug),
    );
    expect((await articles.listPublished({ limit: 2 })).length).toBe(2);
  });

  test("filters by reading time", async () => {
    const short = await articles.listPublished({ maxMinutes: 5 });
    expect(short.length).toBeGreaterThan(0);
    expect(short.every((item) => item.minutes <= 5)).toBe(true);
  });
});

describe("search", () => {
  test("ignores accents and case, matches prefixes and stays in the language", async () => {
    const results = await articles.search("ΔΕΝΤΡΑ επικοιν", {}, 1);
    expect(results.items.map((item) => item.slug)).toContain("ta-dentra-epikoinonoun");
    expect(results.items.every((item) => item.language === "el")).toBe(true);
    const english = await articles.search("trees", { language: "en" }, 1);
    expect(english.items.map((item) => item.slug)).toEqual(["trees-talk-to-each-other"]);
    expect((await articles.search("ανυπαρκτολεξη", {}, 1)).total).toBe(0);
  });
});

describe("views and popularity", () => {
  test("counts views of public articles and ranks popular ones by recent views", async () => {
    const [top] = await articles.listPopular("el", 1);
    const target = (await articles.listPublished()).find((item) => item.slug !== top!.slug)!;
    for (let i = 0; i < 2000; i++) await articles.recordView(target.id);
    const [newTop] = await articles.listPopular("el", 1);
    expect(newTop?.slug).toBe(target.slug);

    const draft = store.articles.find((item) => item.status === "draft")!;
    await articles.recordView(draft.id);
    expect(store.articleViews.some((entry) => entry.articleId === draft.id)).toBe(false);
  });
});

describe("old URLs", () => {
  test("renaming a published article keeps its old slug redirecting", async () => {
    const row = store.articles.find((item) => item.slug === "ta-dentra-epikoinonoun")!;
    const editable = (await articles.findAdminById(row.id))!;
    await articles.save(
      {
        id: row.id,
        slug: "dentra-kai-mykites",
        title: editable.title,
        excerpt: editable.excerpt,
        categorySlug: editable.category.slug,
        status: editable.status,
        dateValue: editable.dateValue,
        content: editable.content,
      },
      editor,
    );
    expect(await articles.resolveOldSlug("ta-dentra-epikoinonoun")).toBe("dentra-kai-mykites");
    expect(await articles.findPublishedBySlug("dentra-kai-mykites")).not.toBeNull();
    expect(await articles.resolveOldSlug("ta-dentra-epikoinonoun", "en")).toBeNull();
  });
});

describe("newsletter", () => {
  test("sign-ups are idempotent; confirm and unsubscribe work by token", async () => {
    const newsletter = new MockNewsletterRepository(store);
    await newsletter.subscribe({ email: "a@example.com", language: "el" });
    await newsletter.subscribe({ email: "a@example.com", language: "en" });
    const [subscriber] = await newsletter.list();
    expect(subscriber).toMatchObject({ email: "a@example.com", language: "en", status: "pending" });
    expect("token" in subscriber!).toBe(false);

    const token = store.subscribers[0]!.token;
    expect(await newsletter.confirm(token)).toBe(true);
    expect(await newsletter.unsubscribe(token)).toBe(true);
    expect(await newsletter.confirm(token)).toBe(false);
    expect(await newsletter.confirm("nope")).toBe(false);
    await newsletter.subscribe({ email: "a@example.com", language: "el" });
    expect((await newsletter.list())[0]?.status).toBe("pending");
  });
});

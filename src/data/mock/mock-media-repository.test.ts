import { beforeEach, describe, expect, test } from "bun:test";
import type { WriteContext } from "@/data/articles/article-repository";
import { createDemoStore, DEMO_USER_ID } from "@/data/mock/demo-seed";
import { MockArticleRepository } from "@/data/mock/mock-article-repository";
import { MockMediaRepository } from "@/data/mock/mock-media-repository";
import type { MockStore } from "@/data/mock/mock-store";

const editor: WriteContext = { actorId: DEMO_USER_ID, actorRole: "owner" };
const author: WriteContext = { actorId: "author-eva", actorRole: "author" };
const png = { fileName: "a.png", mimeType: "image/png" as const, bytes: new Uint8Array(10) };

let store: MockStore;
let media: MockMediaRepository;

beforeEach(() => {
  store = createDemoStore();
  media = new MockMediaRepository(store);
});

describe("MockMediaRepository", () => {
  test("lists demo images with usage counts", async () => {
    const assets = await media.list();
    expect(assets.length).toBeGreaterThanOrEqual(4);
    expect(assets.find((asset) => asset.id === "demo-forest")?.usageCount).toBeGreaterThan(0);
  });

  test("uploads, serves and resolves an image", async () => {
    const asset = await media.upload({ ...png, alt: "Δοκιμή", width: 10, height: 5 }, author);
    expect(asset.src).toBe(`/media/demo/${asset.id}`);
    expect(media.file(asset.id)?.mimeType).toBe("image/png");
    expect(await media.resolve([asset.id, "missing"])).toEqual({
      [asset.id]: { src: asset.src, width: 10, height: 5 },
    });
  });

  test("rejects non-images such as SVG", async () => {
    await expect(
      media.upload(
        { ...png, mimeType: "image/svg+xml" as never, alt: "x", width: null, height: null },
        editor,
      ),
    ).rejects.toThrow("εικόνες");
  });

  test("authors change only their own uploads; used images cannot be deleted", async () => {
    const own = await media.upload({ ...png, alt: "Δική μου", width: null, height: null }, author);
    await media.update({ id: own.id, alt: "Νέο", caption: "" }, author);
    await expect(
      media.update({ id: "demo-forest", alt: "Όχι", caption: "" }, author),
    ).rejects.toThrow();
    await expect(media.remove("demo-forest", editor)).rejects.toThrow("χρησιμοποιείται");
    await media.remove(own.id, author);
    expect(store.media.some((item) => item.id === own.id)).toBe(false);
  });

  test("article pages resolve the images used in their content", async () => {
    const articles = new MockArticleRepository(store);
    const row = store.articles.find((article) => article.status === "published")!;
    row.content = {
      version: 1,
      blocks: [
        {
          id: "7a4f1c3e-8a2b-4c1d-9e0f-1a2b3c4d5e6f",
          type: "image",
          data: { assetId: "demo-octopus", alt: "Χταπόδι" },
        },
      ],
    };
    const detail = await articles.findPublishedBySlug(row.slug);
    expect(detail?.mediaAssets["demo-octopus"]?.src).toBe("/demo/octopus.jpg");
  });
});

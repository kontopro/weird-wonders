import { beforeEach, describe, expect, test } from "bun:test";
import { createDemoStore, DEMO_USER_ID } from "@/data/mock/demo-seed";
import { MockAuthorRepository } from "@/data/mock/mock-author-repository";

let authors: MockAuthorRepository;

beforeEach(() => {
  authors = new MockAuthorRepository(createDemoStore());
});

describe("MockAuthorRepository", () => {
  test("shows public pages only for authors with a published article", async () => {
    expect((await authors.findPublicBySlug("lida-markou"))?.displayName).toBe("Λήδα Μάρκου");
    // Νίκος has only a draft.
    expect(await authors.findPublicBySlug("nikos-arvanitis")).toBeNull();
  });

  test("updates the own profile and protects slug uniqueness", async () => {
    const updated = await authors.updateProfile(DEMO_USER_ID, {
      displayName: "Μαρία Π.",
      slug: "maria-p",
      bio: "Νέο βιογραφικό",
    });
    expect(updated.slug).toBe("maria-p");
    await expect(
      authors.updateProfile(DEMO_USER_ID, { displayName: "Χ", slug: "lida-markou", bio: "" }),
    ).rejects.toMatchObject({ code: "conflict" });
  });
});

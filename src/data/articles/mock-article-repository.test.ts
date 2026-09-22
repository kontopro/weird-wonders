import { describe, expect, test } from "bun:test";

import { MockArticleRepository } from "./mock-article-repository";

describe("MockArticleRepository", () => {
  test("publishing an edited article updates the public repository view", async () => {
    const repository = new MockArticleRepository();
    const original = await repository.findAdminBySlug("rologia-kai-ypologistes");
    expect(original).not.toBeNull();

    const saved = await repository.save({
      id: original!.id,
      slug: original!.slug,
      title: "Νέος τίτλος",
      excerpt: original!.excerpt,
      category: original!.category,
      status: "Δημοσιευμένο",
      dateValue: original!.dateValue,
      image: original!.image,
      imageAlt: "Ρολόι υπολογιστή",
      tags: ["χρόνος"],
      content: original!.content,
      seoTitle: "SEO τίτλος",
      seoDescription: "SEO περιγραφή",
      isFeatured: true,
      isTrending: true,
      isFactOfDay: false,
    });

    expect(saved.content).toEqual(original!.content);
    expect(saved.tags).toEqual(["χρόνος"]);
    expect(saved.seoTitle).toBe("SEO τίτλος");

    const publicArticle = await repository.findPublishedBySlug(original!.slug);
    expect(publicArticle?.title).toBe("Νέος τίτλος");
    expect(publicArticle?.content).toEqual(original!.content);
  });

  test("duplicating creates an independent draft", async () => {
    const repository = new MockArticleRepository();
    const source = await repository.findAdminBySlug("ta-dentra-epikoinonoun");
    expect(source).not.toBeNull();

    const copy = await repository.duplicate(source!.id);
    copy.content.blocks.length = 0;

    const reloadedSource = await repository.findAdminBySlug(source!.slug);
    expect(copy.status).toBe("Πρόχειρο");
    expect(copy.id).not.toBe(source!.id);
    expect(reloadedSource!.content.blocks.length).toBeGreaterThan(0);
  });
});

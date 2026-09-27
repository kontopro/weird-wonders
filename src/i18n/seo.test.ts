import { describe, expect, test } from "bun:test";
import { breadcrumbs, jsonLd, socialMeta, websiteJsonLd } from "@/i18n/seo";

const contentOf = (meta: ReturnType<typeof socialMeta>, key: string) =>
  meta.find((item) => ("property" in item ? item.property : item.name) === key)?.content;

describe("social previews", () => {
  test("pages without an image use the language's share image", () => {
    const meta = socialMeta({
      language: "en",
      title: "About",
      description: "d",
      path: "/en/about",
    });
    expect(contentOf(meta, "og:image")).toBe("https://factaki.gr/og-default-en.png");
    expect(contentOf(meta, "og:url")).toBe("https://factaki.gr/en/about");
    expect(contentOf(meta, "og:locale")).toBe("en_GB");
    expect(contentOf(meta, "og:locale:alternate")).toBe("el_GR");
  });

  test("articles carry their image and article tags", () => {
    const meta = socialMeta({
      language: "el",
      title: "Τίτλος",
      description: "d",
      path: "/arthro/x",
      image: "/demo/a.jpg",
      imageAlt: "Εικόνα",
      type: "article",
      article: {
        publishedTime: "2026-09-01T09:00:00Z",
        modifiedTime: "2026-09-02T10:00:00Z",
        tags: ["α", "β"],
      },
    });
    expect(contentOf(meta, "og:image")).toBe("https://factaki.gr/demo/a.jpg");
    expect(contentOf(meta, "og:image:alt")).toBe("Εικόνα");
    expect(
      meta.filter((item) => "property" in item && item.property === "article:tag"),
    ).toHaveLength(2);
  });
});

describe("structured data", () => {
  test("escapes < so content cannot close the script tag", () => {
    const script = jsonLd({ "@type": "Article", headline: "</script><b>" });
    expect(script.children).not.toContain("<");
    expect(JSON.parse(script.children).headline).toBe("</script><b>");
  });

  test("breadcrumbs and website search use absolute URLs", () => {
    const trail = JSON.parse(breadcrumbs([{ name: "Home", path: "/en" }]).children);
    expect(trail.itemListElement[0]).toMatchObject({ position: 1, item: "https://factaki.gr/en" });
    const site = JSON.parse(websiteJsonLd("en").children);
    expect(site.potentialAction.target.urlTemplate).toBe(
      "https://factaki.gr/en/discover?q={search_term_string}",
    );
  });
});

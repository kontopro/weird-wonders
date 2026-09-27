import { describe, expect, test } from "bun:test";
import { buildRobots, buildRss, buildSitemap } from "@/server/feeds";

describe("feeds (mock data)", () => {
  test("sitemap lists public pages with hreflang alternates, never drafts", async () => {
    const xml = await buildSitemap();
    expect(xml).toStartWith('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<loc>https://factaki.gr/</loc>");
    expect(xml).toContain("<loc>https://factaki.gr/en/article/trees-talk-to-each-other</loc>");
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://factaki.gr/en/article/trees-talk-to-each-other"/>',
    );
    expect(xml).toContain(
      'hreflang="x-default" href="https://factaki.gr/arthro/ta-dentra-epikoinonoun"',
    );
    expect(xml).not.toContain("/admin");
  });

  test("RSS feed per language", async () => {
    const english = await buildRss("en");
    expect(english).toContain("<language>en-GB</language>");
    expect(english).toContain(
      "<link>https://factaki.gr/en/article/trees-talk-to-each-other</link>",
    );
    expect(english).not.toContain("/arthro/");
    const greek = await buildRss("el");
    expect(greek).toContain('<atom:link href="https://factaki.gr/rss.xml"');
    expect(greek.match(/<item>/g)?.length ?? 0).toBeGreaterThan(1);
  });

  test("robots.txt points to the sitemap and keeps the admin out", () => {
    const robots = buildRobots();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap: https://factaki.gr/sitemap.xml");
  });
});

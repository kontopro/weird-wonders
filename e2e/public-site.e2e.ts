import { expect, test } from "./fixtures";

test.describe("public site", () => {
  test("home page: lead story, skip link and language switch", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/FACTάκι/);
    await expect(page.locator("html")).toHaveAttribute("lang", "el");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Μετάβαση στο περιεχόμενο" })).toBeFocused();

    await page.getByRole("link", { name: "English" }).first().click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("article: content, structured data and the English version", async ({ page }) => {
    await page.goto("/arthro/ta-dentra-epikoinonoun");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("δέντρα");
    await expect(page.locator("time").first()).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
    await expect(page.locator(".article-visual img")).toHaveAttribute("srcset", /480w/);

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLd.map((text) => (JSON.parse(text) as { "@type": string })["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Article", "BreadcrumbList"]));
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /^https:\/\/factaki\.gr\//,
    );

    await page.locator(".language-switch").getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/article\/trees-talk-to-each-other$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("trees");
  });

  test("search ignores accents and case", async ({ page }) => {
    await page.goto("/anakalypse?q=ΔΕΝΤΡΑ");
    await expect(
      page.getByRole("link", { name: /Ήξερες ότι τα δέντρα επικοινωνούν/ }).first(),
    ).toBeVisible();
  });

  test("dark mode is remembered and applied before the page paints", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Σκούρο θέμα" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    // The class must already be there in the first HTML the browser renders.
    await page.reload({ waitUntil: "commit" });
    await page.waitForSelector("html.dark", { timeout: 2_000 });
    await page.getByRole("button", { name: "Φωτεινό θέμα" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});

test.describe("missing pages", () => {
  test.use({ allowedConsoleErrors: [/status of 404/] });

  test("unknown pages show the 404 page", async ({ page }) => {
    const response = await page.goto("/arthro/den-yparxei");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("αυτή η σελίδα δεν υπάρχει")).toBeVisible();
  });
});

test.describe("addresses and feeds", () => {
  test("the main language has no prefix", async ({ request }) => {
    const response = await request.get("/el/arthro/ta-dentra-epikoinonoun", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toBe("/arthro/ta-dentra-epikoinonoun");
  });

  test("sitemap, robots.txt and RSS", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<loc>https://factaki.gr/en/article/trees-talk-to-each-other</loc>");
    expect(sitemap).toContain('hreflang="x-default"');

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap: https://factaki.gr/sitemap.xml");

    const rss = await request.get("/en/rss.xml");
    expect(rss.headers()["content-type"]).toContain("application/rss+xml");
    expect(await rss.text()).toContain("<language>en-GB</language>");
  });

  test("pages carry security headers", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("DENY");
  });

  test("the demo newsletter accepts only example addresses", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("textbox", { name: "Email" }).fill("someone@gmail.com");
    await page.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByText(/use an @example\.com address/)).toBeVisible();
  });

  test("e-mail links wait for a click before they are used", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=abc&type=invite");
    await expect(page.getByRole("button", { name: "Συνέχεια" })).toBeVisible();
    await page.goto("/auth/confirm");
    await expect(page.getByRole("alert")).toHaveText("Ο σύνδεσμος δεν είναι πλήρης.");
  });
});

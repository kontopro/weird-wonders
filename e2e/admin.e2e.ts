import { fileURLToPath } from "node:url";
import { author, expect, owner, signInAs, test } from "./fixtures";

const wideImage = fileURLToPath(new URL("./fixtures/wide.png", import.meta.url));

// The admin tests share the demo server's data and build on each other.
test.describe.configure({ mode: "serial" });

test.describe("admin", () => {
  // Unique per run, so a reused dev server does not clash with earlier runs.
  const title = `Δοκιμή e2e ${Date.now()}`;
  let slug = "";

  test("the admin requires signing in", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await expect(page.getByRole("heading", { name: "Σύνδεση συντακτικής ομάδας" })).toBeVisible();
  });

  test("dashboard shows the signed-in person and real numbers", async ({ page }) => {
    await signInAs(page, owner);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Μαρία");
    const stats = page.getByRole("region", { name: "Στατιστικά" });
    await expect(stats).not.toContainText("128");
    await expect(stats.getByText("Συνολικά άρθρα")).toBeVisible();
  });

  test("write, illustrate and publish an article", async ({ page }) => {
    await signInAs(page, owner);
    await page.goto("/admin/articles/new");

    await page.getByRole("textbox", { name: /Τίτλος άρθρου/ }).fill(title);
    slug = await page.getByRole("textbox", { name: "Διεύθυνση (slug)" }).inputValue();
    expect(slug).toMatch(/^dokimi-e2e-\d+$/);
    await page.getByRole("textbox", { name: /Σύντομη περιγραφή/ }).fill("Περίληψη από τη δοκιμή.");

    await page.getByRole("button", { name: "Προσθήκη block" }).click();
    await page.getByRole("menuitem", { name: /Παράγραφος/ }).click();
    await page
      .getByRole("textbox", { name: /Γράψε την παράγραφο/ })
      .fill("Το πρώτο κείμενο της δοκιμής.");

    // Cover: upload through the media picker (the browser makes the smaller copies).
    await page.getByRole("button", { name: "Επιλογή κεντρικής εικόνας" }).click();
    const picker = page.getByRole("dialog", { name: "Επιλογή εικόνας" });
    await picker.locator('input[type="file"]').setInputFiles(wideImage);
    await picker.getByRole("textbox", { name: /Alt text/ }).fill("Κίτρινες ρίγες");
    await picker.getByRole("button", { name: "Ανέβασμα και επιλογή" }).click();
    await expect(picker).toBeHidden();
    await expect(page.getByRole("textbox", { name: "Alt text κεντρικής εικόνας" })).toHaveValue(
      "Κίτρινες ρίγες",
    );

    await page.getByRole("button", { name: "Δημοσίευση" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Δημοσίευση" }).click();
    await expect(page.getByText("Το άρθρο δημοσιεύτηκε.")).toBeVisible();
  });

  test("the published article is public, with responsive cover and in the feeds", async ({
    page,
    request,
  }) => {
    await page.goto(`/arthro/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText("Το πρώτο κείμενο της δοκιμής.")).toBeVisible();
    const cover = page.locator(".article-visual img");
    await expect(cover).toHaveAttribute("alt", "Κίτρινες ρίγες");
    await expect(cover).toHaveAttribute("srcset", /-w480 480w.*-w960 960w.*-w1440 1440w/);
    // The browser can load the copy it picked.
    expect(await cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(
      0,
    );

    expect(await (await request.get("/sitemap.xml")).text()).toContain(`/arthro/${slug}</loc>`);
    expect(await (await request.get("/rss.xml")).text()).toContain(`/arthro/${slug}</link>`);
  });

  test("start an English version: a linked draft that is not public yet", async ({
    page,
    request,
  }) => {
    await signInAs(page, owner);
    await page.goto(`/admin/articles?q=${encodeURIComponent(title)}`);
    await page.getByRole("link", { name: title, exact: true }).click();
    await page.getByRole("button", { name: "Δημιουργία έκδοσης: English" }).click();
    // The new version's editor shows its English address.
    await expect(page.getByText("factaki.gr/en/article/")).toBeVisible();
    const englishSlug = await page.getByRole("textbox", { name: "Διεύθυνση (slug)" }).inputValue();
    expect((await request.get(`/en/article/${englishSlug}`)).status()).toBe(404);
  });

  test("article list: filters live in the address", async ({ page }) => {
    await signInAs(page, owner);
    await page.goto("/admin/articles");

    const search = page.getByRole("searchbox", { name: "Αναζήτηση άρθρων" });
    await search.fill(title);
    await search.press("Enter");
    await expect(page).toHaveURL(/[?&]q=/);
    await expect(page.getByRole("row", { name: new RegExp(title) }).first()).toBeVisible();
    await expect(page.getByText(/με αυτά τα φίλτρα/)).toBeVisible();

    await page.getByRole("combobox", { name: "Κατάσταση" }).selectOption("draft");
    await expect(page).toHaveURL(/status=draft/);
    // Only the English draft of the test article is left.
    await expect(page.getByRole("row", { name: /EN/ })).toHaveCount(1);

    // Reloading keeps the filters.
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Κατάσταση" })).toHaveValue("draft");
  });

  test("authors do not see team or newsletter management", async ({ page }) => {
    await signInAs(page, author);
    const nav = page.getByRole("navigation", { name: "Πλοήγηση διαχείρισης" });
    await expect(nav.getByRole("link", { name: "Άρθρα" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Ομάδα" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Newsletter" })).toHaveCount(0);
    await page.goto("/admin/team");
    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test("owners invite a new team member", async ({ page }) => {
    const email = `nea-${Date.now()}@example.com`;
    await signInAs(page, owner);
    await page.goto("/admin/team");
    await page.getByRole("button", { name: "Πρόσκληση μέλους" }).click();
    await page.getByRole("textbox", { name: "Όνομα" }).fill("Νέα Συντάκτρια");
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("button", { name: "Αποστολή πρόσκλησης" }).click();
    await expect(page.getByRole("region", { name: "Μέλη ομάδας" })).toContainText(email);
  });
});

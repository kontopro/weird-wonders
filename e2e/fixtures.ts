import { expect, test as base, type Page } from "@playwright/test";

/**
 * Every test fails on a JavaScript error or a React warning in the browser
 * console (hydration mismatches, failed requests…), not only on assertions.
 */
export const test = base.extend<{ consoleErrors: string[]; allowedConsoleErrors: RegExp[] }>({
  /** Console errors a test expects (e.g. the 404 response of a missing page). */
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use(errors);
      const unexpected = errors.filter(
        (error) => !allowedConsoleErrors.some((pattern) => pattern.test(error)),
      );
      expect(unexpected, "browser console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Signs in with a demo account (mock mode) by the person's name. */
export async function signInAs(page: Page, name: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name }).click();
  await page.waitForURL(/\/admin\/?$/);
  // Let the dashboard finish loading: leaving mid-request logs aborted fetches.
  await expect(page.getByRole("region", { name: "Στατιστικά" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

export const owner = /Μαρία Παπαδοπούλου/;
export const author = /Εύα Πέτρου/;

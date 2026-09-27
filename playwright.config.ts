import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env["E2E_PORT"] ?? 4173);

/**
 * Browser tests of the public site and the admin, against a production build
 * with demo data (see `e2e/serve.ts`). One worker: the tests share the demo
 * server's in-memory data, like editors sharing one blog.
 *
 * First time: `bunx playwright install chromium`.
 */
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  timeout: 60_000,
  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    locale: "el-GR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun e2e/serve.ts",
    url: `http://localhost:${port}/robots.txt`,
    reuseExistingServer: !process.env["CI"],
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

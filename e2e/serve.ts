/**
 * Builds the site with demo data and the demo admin, then serves it for the
 * browser tests (`bun run test:e2e`). Environment variables set here win over
 * `.env.local`, so the tests never touch a real Supabase project.
 */
import { spawn } from "node:child_process";

const port = process.env["E2E_PORT"] ?? "4173";
const env = {
  ...process.env,
  VITE_DATA_SOURCE: "mock",
  VITE_ENABLE_DEMO_ADMIN: "true",
  VITE_SITE_URL: "https://factaki.gr",
};

const run = (command: string, args: string[], extra: Record<string, string> = {}) =>
  spawn(command, args, {
    stdio: "inherit",
    env: { ...env, ...extra },
    // Windows finds `node` through the shell.
    shell: process.platform === "win32",
  });

if (process.env["E2E_SKIP_BUILD"] !== "1") {
  const code = await new Promise<number | null>((resolve) =>
    run(process.execPath, ["x", "vite", "build"]).on("exit", resolve),
  );
  if (code !== 0) process.exit(code ?? 1);
}

// The built server runs on Node.js (as on Vercel); Bun cannot parse part of it.
const server = run("node", [".output/server/index.mjs"], { PORT: port });
server.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.kill(signal));
}

import { describe, expect, test } from "bun:test";
import { AuthorizationError, requireMember, resolveAuthState } from "@/server/auth";

// Under `bun test` there is no VITE_DATA_SOURCE and no dev server, so the app
// runs in mock mode with the demo admin disabled — i.e. a deployed demo.
describe("server auth guard (mock mode, demo admin disabled)", () => {
  test("treats every visitor as anonymous", async () => {
    expect(await resolveAuthState()).toEqual({ status: "anonymous" });
  });

  test("rejects admin server functions", async () => {
    await expect(requireMember()).rejects.toBeInstanceOf(AuthorizationError);
  });
});

import { describe, expect, test } from "bun:test";
import type { SessionCookie } from "@/data/auth/auth-provider";
import { createDemoStore, DEMO_USER_ID } from "@/data/mock/demo-seed";
import { MockAuthProvider } from "@/data/mock/mock-auth-provider";

function memoryCookie(): SessionCookie & { value: string | undefined } {
  const cookie = {
    value: undefined as string | undefined,
    get: () => cookie.value,
    set: (value: string) => {
      cookie.value = value;
    },
    clear: () => {
      cookie.value = undefined;
    },
  };
  return cookie;
}

describe("MockAuthProvider", () => {
  test("offers only active members as demo accounts", () => {
    const provider = new MockAuthProvider(createDemoStore(), memoryCookie(), true);
    const options = provider.getLoginOptions();
    expect(options.method).toBe("demo");
    if (options.method !== "demo") return;
    expect(options.accounts.map((account) => account.role)).toContain("author");
    expect(options.accounts.some((account) => account.id === "author-iason")).toBe(false);
  });

  test("signs in as the chosen member with that member's role", async () => {
    const cookie = memoryCookie();
    const provider = new MockAuthProvider(createDemoStore(), cookie, true);
    expect(await provider.signIn({ method: "demo", userId: "author-eva" })).toEqual({ ok: true });
    const state = await provider.getAuthState();
    expect(state.status === "member" && state.user.role).toBe("author");

    await provider.signOut();
    expect(await provider.getAuthState()).toEqual({ status: "anonymous" });
  });

  test("rejects suspended or unknown accounts and password sign-in", async () => {
    const provider = new MockAuthProvider(createDemoStore(), memoryCookie(), true);
    expect((await provider.signIn({ method: "demo", userId: "author-iason" })).ok).toBe(false);
    expect((await provider.signIn({ method: "demo", userId: "nobody" })).ok).toBe(false);
    const password = await provider.signIn({ method: "password", email: "a@b.gr", password: "x" });
    expect(password.ok).toBe(false);
  });

  test("ignores a stale session cookie when the demo admin is disabled", async () => {
    const cookie = memoryCookie();
    cookie.set(DEMO_USER_ID);
    const provider = new MockAuthProvider(createDemoStore(), cookie, false);
    expect(await provider.getAuthState()).toEqual({ status: "anonymous" });
    expect(provider.getLoginOptions().method).toBe("disabled");
    expect((await provider.signIn({ method: "demo", userId: DEMO_USER_ID })).ok).toBe(false);
  });
});

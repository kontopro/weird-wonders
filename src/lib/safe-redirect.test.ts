import { describe, expect, test } from "bun:test";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  test("keeps same-origin relative paths", () => {
    expect(safeRedirectPath("/admin/articles?x=1")).toBe("/admin/articles?x=1");
  });

  test.each([
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["absolute URL", "https://evil.example"],
    ["javascript URL", "javascript:alert(1)"],
    ["control characters", "/\tadmin"],
    ["empty", ""],
    ["non-string", 42],
  ])("rejects %s", (_label, value) => {
    expect(safeRedirectPath(value)).toBe("/admin");
  });
});

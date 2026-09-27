import { describe, expect, test } from "bun:test";
import { srcSetOf } from "@/domain/media";

describe("srcSetOf", () => {
  test("lists smaller copies, narrowest first, then the original", () => {
    expect(
      srcSetOf("/a.webp", 1600, [
        { width: 960, src: "/a-w960.webp" },
        { width: 480, src: "/a-w480.webp" },
      ]),
    ).toBe("/a-w480.webp 480w, /a-w960.webp 960w, /a.webp 1600w");
  });

  test("is empty without copies or a known width", () => {
    expect(srcSetOf("/a.webp", 1600, [])).toBe("");
    expect(srcSetOf("/a.webp", null, [{ width: 480, src: "/a-w480.webp" }])).toBe("");
  });

  test("ignores copies that are not smaller than the original", () => {
    expect(srcSetOf("/a.webp", 900, [{ width: 960, src: "/a-w960.webp" }])).toBe("/a.webp 900w");
  });
});

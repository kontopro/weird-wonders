import { describe, expect, test } from "bun:test";
import { detectImageType, srcSetOf } from "@/domain/media";

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

describe("detectImageType", () => {
  // First bytes of real 4×4 images in each format.
  const samples = {
    "image/jpeg": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS",
    "image/png": "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGM8wcXF",
    "image/gif": "R0lGODdhBAAEAIEAAMgKCgAAAAAAAAAAACwAAAAABAAEAAAICQABCBxIsCCAgAA7",
    "image/webp": "UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoEAAQAAUAmJaACdLoB+AADsAD+9hNf",
    "image/avif": "AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAh",
  } as const;

  test("recognises each allowed format from its contents", () => {
    for (const [type, base64] of Object.entries(samples)) {
      expect(detectImageType(Uint8Array.from(Buffer.from(base64, "base64")))).toBe(
        type as keyof typeof samples,
      );
    }
  });

  test("rejects anything else, whatever its name says", () => {
    const text = (value: string) => new TextEncoder().encode(value);
    expect(
      detectImageType(text('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')),
    ).toBeNull();
    expect(detectImageType(text("<!doctype html><script>alert(1)</script>"))).toBeNull();
    expect(detectImageType(text("%PDF-1.7 ......"))).toBeNull();
    expect(detectImageType(new Uint8Array(4))).toBeNull();
  });
});

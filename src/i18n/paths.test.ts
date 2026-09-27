import { describe, expect, test } from "bun:test";
import { absoluteUrl, localizedPath, toInternalPath, toPublicPath } from "@/i18n/paths";

describe("localized paths (el main, en prefixed)", () => {
  test("maps English URL words to internal routes and back", () => {
    expect(toInternalPath("/en/article/trees-talk")).toBe("/en/arthro/trees-talk");
    expect(toPublicPath("/en/arthro/trees-talk")).toBe("/en/article/trees-talk");
    expect(toInternalPath("/en/categories")).toBe("/en/katigories");
    expect(toPublicPath("/en/sxetika")).toBe("/en/about");
  });

  test("leaves main-language, admin and unknown paths alone", () => {
    expect(toInternalPath("/arthro/ta-dentra")).toBeNull();
    expect(toPublicPath("/arthro/ta-dentra")).toBeNull();
    expect(toInternalPath("/admin/articles")).toBeNull();
    expect(toInternalPath("/en")).toBeNull();
    expect(toInternalPath("/en/unknown")).toBeNull();
    expect(toInternalPath("/fr/article/x")).toBeNull();
  });

  test("builds localized paths for any language", () => {
    expect(localizedPath("el", "/arthro/x")).toBe("/arthro/x");
    expect(localizedPath("en", "/arthro/x")).toBe("/en/article/x");
    expect(localizedPath("en", "/")).toBe("/en");
  });
});

describe("absoluteUrl", () => {
  test("prefixes paths with the site address and keeps absolute URLs", () => {
    expect(absoluteUrl("/en/article/x")).toBe("https://factaki.gr/en/article/x");
    expect(absoluteUrl("demo/a.jpg")).toBe("https://factaki.gr/demo/a.jpg");
    expect(absoluteUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });
});

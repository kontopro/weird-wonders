import { describe, expect, test } from "bun:test";

import { parseBookmarks } from "./bookmarks";

describe("parseBookmarks", () => {
  test("returns an empty list for corrupt or unexpected storage data", () => {
    expect(parseBookmarks("not-json")).toEqual([]);
    expect(parseBookmarks('{"slug":"article"}')).toEqual([]);
    expect(parseBookmarks(null)).toEqual([]);
  });

  test("keeps unique string slugs only", () => {
    expect(parseBookmarks('["one", 42, "one", "two"]')).toEqual(["one", "two"]);
  });
});

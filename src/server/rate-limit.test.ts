import { beforeEach, describe, expect, test } from "bun:test";
import { hit, rateLimits, resetRateLimits } from "@/server/rate-limit";

beforeEach(() => resetRateLimits());

describe("rate limits", () => {
  test("allows up to the limit per visitor, then refuses until the window ends", () => {
    const { limit, windowMs } = rateLimits.subscribe;
    const start = 1_000_000;
    for (let index = 0; index < limit; index += 1) {
      expect(hit("subscribe", "visitor-a", "", start)).toBe(true);
    }
    expect(hit("subscribe", "visitor-a", "", start + 1)).toBe(false);
    // Other visitors and other actions are counted separately.
    expect(hit("subscribe", "visitor-b", "", start + 1)).toBe(true);
    expect(hit("signIn", "visitor-a", "", start + 1)).toBe(true);
    // A new window starts afresh.
    expect(hit("subscribe", "visitor-a", "", start + windowMs)).toBe(true);
  });

  test("scopes count separately (one view per article)", () => {
    expect(hit("viewPerArticle", "visitor-a", "article-1", 0)).toBe(true);
    expect(hit("viewPerArticle", "visitor-a", "article-1", 1)).toBe(false);
    expect(hit("viewPerArticle", "visitor-a", "article-2", 2)).toBe(true);
  });
});

import { describe, expect, test } from "bun:test";

import { calculateReadingTimeMinutes, safeParseArticleContent } from "./article-content";

describe("article content validation", () => {
  test("rejects unsafe URLs", () => {
    const result = safeParseArticleContent({
      version: 1,
      blocks: [
        {
          id: crypto.randomUUID(),
          type: "callToAction",
          data: {
            title: "Unsafe",
            label: "Open",
            url: "javascript:alert(1)",
            tone: "primary",
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("rejects duplicate block IDs", () => {
    const id = crypto.randomUUID();
    const result = safeParseArticleContent({
      version: 1,
      blocks: [
        { id, type: "paragraph", data: { text: "One" } },
        { id, type: "paragraph", data: { text: "Two" } },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("calculates a minimum one-minute reading time from visible block text", () => {
    expect(calculateReadingTimeMinutes({ version: 1, blocks: [] })).toBe(1);

    expect(
      calculateReadingTimeMinutes({
        version: 1,
        blocks: [
          {
            id: crypto.randomUUID(),
            type: "paragraph",
            data: { text: Array.from({ length: 201 }, () => "λέξη").join(" ") },
          },
        ],
      }),
    ).toBe(2);
  });
});

import { describe, expect, test } from "bun:test";
import { findMatchingTag } from "@/domain/taxonomy";

describe("findMatchingTag", () => {
  const existing = [{ slug: "custom-slug", name: "Θάλασσα" }];

  test("matches by slug or by case-insensitive name", () => {
    expect(findMatchingTag(existing, { slug: "custom-slug", name: "άλλο" })).toBe(existing[0]);
    expect(findMatchingTag(existing, { slug: "thalassa", name: "θάλασσα " })).toBe(existing[0]);
  });

  test("returns nothing for a genuinely new tag", () => {
    expect(findMatchingTag(existing, { slug: "vouno", name: "Βουνό" })).toBeUndefined();
  });
});

import { describe, expect, test } from "bun:test";
import { matchesSearch, pageOf, searchTerms, searchText } from "@/domain/listing";

describe("listing rules", () => {
  test("pages are 1-based, clamped and report their count", () => {
    const page = pageOf([1, 2, 3, 4, 5], 2, 2);
    expect(page).toMatchObject({ items: [3, 4], total: 5, page: 2, pageCount: 3 });
    expect(pageOf([1], -4, 2).page).toBe(1);
    expect(pageOf([], 1).pageCount).toBe(1);
  });

  test("search ignores accents and case and matches word prefixes", () => {
    expect(searchText("Δέντρα ΜΥΚΌΡΡΙΖΑ")).toBe("δεντρα μυκορριζα");
    const terms = searchTerms("  μυκορ, ΔΕΝΤ ");
    expect(terms).toEqual(["μυκορ", "δεντ"]);
    expect(matchesSearch("Τα δέντρα και η μυκόρριζα", terms)).toBe(true);
    expect(matchesSearch("Τα δέντρα", terms)).toBe(false);
    expect(matchesSearch("anything", [])).toBe(false);
  });
});

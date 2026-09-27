import { describe, expect, test } from "bun:test";
import { isSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  test.each([
    ["Ρολόγια και υπολογιστές", "rologia-kai-ypologistes"],
    ["Τα δέντρα επικοινωνούν", "ta-dentra-epikoinonoun"],
    ["Ψυχή & Χρόνος 2026!", "psychi-chronos-2026"],
    ["  Already-latin Slug ", "already-latin-slug"],
    ["Ήξερες ότι;", "ixeres-oti"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  test("always produces a database-valid slug or an empty string", () => {
    for (const input of ["Ω!", "???", "Άλφα—Ωμέγα", "a".repeat(300)]) {
      const slug = slugify(input);
      expect(slug === "" || isSlug(slug)).toBe(true);
    }
  });
});

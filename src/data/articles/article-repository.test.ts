import { describe, expect, test } from "bun:test";
import { parseArticleWriteInput, type ArticleWriteInput } from "./article-repository";

const validInput: ArticleWriteInput = {
  slug: "neo-arthro",
  title: "Νέο άρθρο",
  excerpt: "Περίληψη",
  category: "Επιστήμη",
  status: "Πρόχειρο",
  dateValue: "2026-09-27",
  content: { version: 1, blocks: [] },
};

describe("parseArticleWriteInput", () => {
  test("accepts a valid payload and drops undefined optional keys", () => {
    const parsed = parseArticleWriteInput({ ...validInput, image: undefined });
    expect(parsed).toEqual(validInput);
    expect("image" in parsed).toBe(false);
  });

  test("rejects unknown fields so clients cannot write columns they do not own", () => {
    expect(() => parseArticleWriteInput({ ...validInput, published_at: "2020-01-01" })).toThrow();
  });

  test("rejects an unknown status", () => {
    expect(() => parseArticleWriteInput({ ...validInput, status: "published" })).toThrow();
  });

  test("rejects a non-normalized slug", () => {
    expect(() => parseArticleWriteInput({ ...validInput, slug: "Bad Slug" })).toThrow();
  });
});

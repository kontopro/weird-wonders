import { describe, expect, test } from "bun:test";
import { parseInline, stripInline } from "@/lib/inline-markup";

describe("parseInline", () => {
  test("parses bold, italic and links, including nesting", () => {
    expect(parseInline("a **b** *c* [d **e**](https://x.gr)")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", children: [{ type: "text", text: "b" }] },
      { type: "text", text: " " },
      { type: "italic", children: [{ type: "text", text: "c" }] },
      { type: "text", text: " " },
      {
        type: "link",
        href: "https://x.gr",
        children: [
          { type: "text", text: "d " },
          { type: "bold", children: [{ type: "text", text: "e" }] },
        ],
      },
    ]);
  });

  test("keeps unsafe links and unmatched markers as literal text", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([
      { type: "text", text: "[x](javascript:alert(1))" },
    ]);
    expect(parseInline("2 * 3 = 6 and **open")).toEqual([
      { type: "text", text: "2 * 3 = 6 and **open" },
    ]);
    expect(parseInline("<script>alert(1)</script>")).toEqual([
      { type: "text", text: "<script>alert(1)</script>" },
    ]);
  });

  test("allows site-relative and mailto links but not protocol-relative ones", () => {
    expect(parseInline("[a](/arthro/x)")[0]).toMatchObject({ type: "link", href: "/arthro/x" });
    expect(parseInline("[a](mailto:a@b.gr)")[0]).toMatchObject({ type: "link" });
    expect(parseInline("[a](//evil.example)")[0]).toMatchObject({ type: "text" });
  });

  test("stripInline returns the visible text", () => {
    expect(stripInline("Τα **δέντρα** *επικοινωνούν* [εδώ](https://x.gr)")).toBe(
      "Τα δέντρα επικοινωνούν εδώ",
    );
  });
});

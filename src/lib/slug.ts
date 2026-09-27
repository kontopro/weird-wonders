const greekDigraphs: ReadonlyArray<readonly [string, string]> = [
  ["ου", "ou"],
  ["γγ", "ng"],
  ["γκ", "gk"],
  ["μπ", "mp"],
  ["ντ", "nt"],
];

const greekLetters: Readonly<Record<string, string>> = {
  α: "a",
  β: "v",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "i",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "f",
  χ: "ch",
  ψ: "ps",
  ω: "o",
};

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 120;

/**
 * Builds a URL-safe Latin slug. Greek is transliterated (e.g. «Ρολόγια και
 * υπολογιστές» → `rologia-kai-ypologistes`), so slugs always satisfy the
 * normalized-slug rule enforced by the database.
 */
export function slugify(value: string): string {
  let text = value.toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [from, to] of greekDigraphs) text = text.replaceAll(from, to);
  text = Array.from(text, (char) => greekLetters[char] ?? char).join("");
  return text
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function isSlug(value: string) {
  return SLUG_PATTERN.test(value) && value.length <= SLUG_MAX_LENGTH;
}

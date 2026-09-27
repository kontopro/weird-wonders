/**
 * Article workflow states. The codes are stable identifiers shared with the
 * database and every adapter; the labels are presentation only, so a blog in
 * another language changes `articleStatusLabels` and nothing else.
 */
export const articleStatuses = [
  "draft",
  "in_review",
  "scheduled",
  "published",
  "archived",
] as const;

export type ArticleStatus = (typeof articleStatuses)[number];

export const articleStatusLabels: Record<ArticleStatus, string> = {
  draft: "Πρόχειρο",
  in_review: "Σε έλεγχο",
  scheduled: "Προγραμματισμένο",
  published: "Δημοσιευμένο",
  archived: "Αρχειοθετημένο",
};

export function isArticleStatus(value: unknown): value is ArticleStatus {
  return typeof value === "string" && (articleStatuses as readonly string[]).includes(value);
}

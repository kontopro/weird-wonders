import { z } from "zod";
import { isSlug } from "@/lib/slug";

/** Visual identity of a category: drives both its colour class and its icon. */
export const categoryIconKeys = [
  "science",
  "history",
  "technology",
  "nature",
  "space",
  "culture",
  "human",
  "daily",
] as const;
export type CategoryIconKey = (typeof categoryIconKeys)[number];

export const categoryIconLabels: Record<CategoryIconKey, string> = {
  science: "Επιστήμη",
  history: "Ιστορία",
  technology: "Τεχνολογία",
  nature: "Φύση",
  space: "Διάστημα",
  culture: "Πολιτισμός",
  human: "Άνθρωπος",
  daily: "Καθημερινότητα",
};

export function toCategoryIconKey(value: unknown): CategoryIconKey | null {
  return categoryIconKeys.find((key) => key === value) ?? null;
}

/** What an article needs to know about its category. */
export type CategoryRef = { slug: string; name: string; iconKey: CategoryIconKey | null };

export type Category = CategoryRef & {
  id: string;
  description: string;
  sortOrder: number;
  /** Number of published articles in the category. */
  publishedCount: number;
};

export type TagRef = { slug: string; name: string };

export type Tag = TagRef & {
  id: string;
  /** Number of published articles with the tag. */
  publishedCount: number;
};

export const uncategorized: CategoryRef = {
  slug: "xoris-katigoria",
  name: "Χωρίς κατηγορία",
  iconKey: null,
};

const slugSchema = z.string().refine(isSlug, "Μόνο λατινικά πεζά, αριθμοί και παύλες.");

export const categoryInputSchema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    name: z.string().trim().min(1, "Το όνομα είναι υποχρεωτικό.").max(100),
    slug: slugSchema,
    description: z.string().trim().max(1000),
    iconKey: z.enum(categoryIconKeys).nullable(),
    sortOrder: z.number().int().min(0).max(100_000),
  })
  .strict();

export type CategoryInput = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  iconKey: CategoryIconKey | null;
  sortOrder: number;
};

export function parseCategoryInput(input: unknown): CategoryInput {
  const { id, ...rest } = categoryInputSchema.parse(input);
  return id ? { id, ...rest } : rest;
}

export function sortCategories<T extends Pick<Category, "sortOrder" | "name">>(items: T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "el"));
}

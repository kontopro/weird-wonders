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

/** Name, slug (and description) of a category or tag in a language other than the main one. */
export type TaxonomyTranslation = {
  language: string;
  name: string;
  slug: string;
  description: string;
};

/**
 * A category as shown in one language: `name`, `slug` and `description` are
 * localized (falling back to the main language); `translations` lists all
 * non-main versions for the admin.
 */
export type Category = CategoryRef & {
  id: string;
  description: string;
  sortOrder: number;
  /** Number of published articles in the category (in the requested language). */
  publishedCount: number;
  translations: TaxonomyTranslation[];
  /** Slug in every language (main + translations), for language links. */
  slugsByLanguage: Record<string, string>;
};

export type TagRef = { slug: string; name: string };

export type Tag = TagRef & {
  id: string;
  /** Number of published articles with the tag (in the requested language). */
  publishedCount: number;
  translations: TaxonomyTranslation[];
  slugsByLanguage: Record<string, string>;
};

/** Slug per language: the main-language slug plus each translation's. */
export function slugsByLanguage(
  mainSlug: string,
  mainLanguage: string,
  translations: readonly TaxonomyTranslation[],
): Record<string, string> {
  return Object.fromEntries([
    [mainLanguage, mainSlug],
    ...translations.map((item) => [item.language, item.slug]),
  ]);
}

/** Localized name/slug/description; falls back to the main-language row. */
export function localizeTaxonomy<T extends { name: string; slug: string; description?: string }>(
  base: T,
  translations: readonly TaxonomyTranslation[],
  language: string | undefined,
): T {
  const translation = language
    ? translations.find((item) => item.language === language)
    : undefined;
  if (!translation) return base;
  return {
    ...base,
    name: translation.name,
    slug: translation.slug,
    ...(base.description !== undefined
      ? { description: translation.description || base.description }
      : {}),
  };
}

const translationSchema = z
  .object({
    language: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
    name: z.string().trim().min(1, "Το όνομα της μετάφρασης είναι υποχρεωτικό.").max(100),
    slug: z.string().refine(isSlug, "Μόνο λατινικά πεζά, αριθμοί και παύλες."),
    description: z.string().trim().max(1000),
  })
  .strict();

export const taxonomyTranslationsSchema = z.array(translationSchema).max(20);

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
    translations: taxonomyTranslationsSchema.optional(),
  })
  .strict();

export type CategoryInput = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  iconKey: CategoryIconKey | null;
  sortOrder: number;
  /** Replaces all non-main-language versions when given. */
  translations?: TaxonomyTranslation[];
};

export function parseCategoryInput(input: unknown): CategoryInput {
  const { id, translations, ...rest } = categoryInputSchema.parse(input);
  return { ...(id ? { id } : {}), ...(translations ? { translations } : {}), ...rest };
}

export const tagTranslationsInputSchema = z
  .object({ tagId: z.string().min(1).max(100), translations: taxonomyTranslationsSchema })
  .strict();
export type TagTranslationsInput = z.infer<typeof tagTranslationsInputSchema>;

export function sortCategories<T extends Pick<Category, "sortOrder" | "name">>(items: T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "el"));
}

/**
 * An existing tag matches a requested one by slug or by name, ignoring case —
 * the same rule as `public.set_article_tags`, so no tag is silently dropped.
 */
export function findMatchingTag<T extends { slug: string; name: string }>(
  existing: readonly T[],
  wanted: { slug: string; name: string },
): T | undefined {
  const name = wanted.name.trim().toLocaleLowerCase();
  return existing.find(
    (tag) => tag.slug === wanted.slug || tag.name.trim().toLocaleLowerCase() === name,
  );
}

/** Only editors and above create new tags; authors reuse existing ones. */
export const newTagForbiddenMessage =
  "Μόνο οι επιμελητές δημιουργούν νέες ετικέτες. Διάλεξε από τις υπάρχουσες.";

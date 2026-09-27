import type { Category, CategoryInput, Tag, TagTranslationsInput } from "@/domain/taxonomy";

/**
 * Categories and tags. Read methods take an optional language (default: the
 * main language) and return localized names and slugs, falling back to the
 * main language where no translation exists.
 */
export interface TaxonomyRepository {
  /** All categories, ordered for display, with published-article counts. */
  listCategories(language?: string): Promise<Category[]>;
  /** Finds a category by its slug in that language. */
  findCategoryBySlug(slug: string, language?: string): Promise<Category | null>;
  saveCategory(input: CategoryInput): Promise<Category>;
  /** Articles in the category become uncategorized (they are not deleted). */
  deleteCategory(id: string): Promise<void>;
  /** All tags, alphabetically, with published-article counts. */
  listTags(language?: string): Promise<Tag[]>;
  findTagBySlug(slug: string, language?: string): Promise<Tag | null>;
  /** Replaces a tag's non-main-language versions. */
  saveTagTranslations(input: TagTranslationsInput): Promise<Tag>;
}

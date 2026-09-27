import type { Category, CategoryInput, Tag } from "@/domain/taxonomy";

export interface TaxonomyRepository {
  /** All categories, ordered for display, with published-article counts. */
  listCategories(): Promise<Category[]>;
  findCategoryBySlug(slug: string): Promise<Category | null>;
  saveCategory(input: CategoryInput): Promise<Category>;
  /** Articles in the category become uncategorized (they are not deleted). */
  deleteCategory(id: string): Promise<void>;
  /** All tags, alphabetically, with published-article counts. */
  listTags(): Promise<Tag[]>;
  findTagBySlug(slug: string): Promise<Tag | null>;
}

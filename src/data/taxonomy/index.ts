import {
  deleteCategory,
  getCategory,
  getTag,
  listCategories,
  listTags,
  saveCategory,
  saveTagTranslations,
} from "@/functions/taxonomy";
import type { CategoryInput, TagTranslationsInput } from "@/domain/taxonomy";

/** Isomorphic entry point; every call runs on the server. Language defaults to the main one. */
export const taxonomyApi = {
  listCategories: (language?: string) => listCategories({ data: language }),
  findCategoryBySlug: (slug: string, language?: string) =>
    getCategory({ data: { slug, ...(language ? { language } : {}) } }),
  saveCategory: (input: CategoryInput) => saveCategory({ data: input }),
  deleteCategory: (id: string) => deleteCategory({ data: id }),
  listTags: (language?: string) => listTags({ data: language }),
  findTagBySlug: (slug: string, language?: string) =>
    getTag({ data: { slug, ...(language ? { language } : {}) } }),
  saveTagTranslations: (input: TagTranslationsInput) => saveTagTranslations({ data: input }),
};

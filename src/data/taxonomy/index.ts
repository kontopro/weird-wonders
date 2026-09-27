import {
  deleteCategory,
  getCategory,
  getTag,
  listCategories,
  listTags,
  saveCategory,
} from "@/functions/taxonomy";
import type { CategoryInput } from "@/domain/taxonomy";

/** Isomorphic entry point; every call runs on the server. */
export const taxonomyApi = {
  listCategories: () => listCategories(),
  findCategoryBySlug: (slug: string) => getCategory({ data: slug }),
  saveCategory: (input: CategoryInput) => saveCategory({ data: input }),
  deleteCategory: (id: string) => deleteCategory({ data: id }),
  listTags: () => listTags(),
  findTagBySlug: (slug: string) => getTag({ data: slug }),
};

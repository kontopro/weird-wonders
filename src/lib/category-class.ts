import type { CategoryRef } from "@/domain/taxonomy";

/** CSS colour class for a category (see the category styles in styles.css). */
export function categoryClass(category: Pick<CategoryRef, "iconKey">) {
  return category.iconKey ?? "";
}

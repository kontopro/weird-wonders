import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { editorRoles } from "@/domain/permissions";
import { parseCategoryInput, type CategoryInput } from "@/domain/taxonomy";
import { requireMember } from "@/server/auth";
import { getRepositories } from "@/server/repositories";

const slugSchema = z.string().trim().min(1).max(200);
const idSchema = z.string().trim().min(1).max(100);

export const listCategories = createServerFn({ method: "GET" }).handler(() =>
  getRepositories().taxonomy.listCategories(),
);

export const getCategory = createServerFn({ method: "GET" })
  .validator((slug: string) => slugSchema.parse(slug))
  .handler(({ data: slug }) => getRepositories().taxonomy.findCategoryBySlug(slug));

export const saveCategory = createServerFn({ method: "POST" })
  .validator((input: CategoryInput) => parseCategoryInput(input))
  .handler(async ({ data }) => {
    await requireMember(editorRoles);
    return getRepositories().taxonomy.saveCategory(data);
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .validator((id: string) => idSchema.parse(id))
  .handler(async ({ data: id }) => {
    await requireMember(editorRoles);
    await getRepositories().taxonomy.deleteCategory(id);
  });

export const listTags = createServerFn({ method: "GET" }).handler(() =>
  getRepositories().taxonomy.listTags(),
);

export const getTag = createServerFn({ method: "GET" })
  .validator((slug: string) => slugSchema.parse(slug))
  .handler(({ data: slug }) => getRepositories().taxonomy.findTagBySlug(slug));

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { editorRoles } from "@/domain/permissions";
import {
  parseCategoryInput,
  tagTranslationsInputSchema,
  type CategoryInput,
  type TagTranslationsInput,
} from "@/domain/taxonomy";
import { requireMember } from "@/server/auth";
import { getRepositories } from "@/server/repositories";

const slugSchema = z.string().trim().min(1).max(200);
const idSchema = z.string().trim().min(1).max(100);
const languageSchema = z
  .string()
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/)
  .optional();
const lookupSchema = z.object({ slug: slugSchema, language: languageSchema }).strict();

export const listCategories = createServerFn({ method: "GET" })
  .validator((language: string | undefined) => languageSchema.parse(language))
  .handler(({ data: language }) => getRepositories().taxonomy.listCategories(language));

export const getCategory = createServerFn({ method: "GET" })
  .validator((input: { slug: string; language?: string }) => lookupSchema.parse(input))
  .handler(({ data }) => getRepositories().taxonomy.findCategoryBySlug(data.slug, data.language));

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

export const listTags = createServerFn({ method: "GET" })
  .validator((language: string | undefined) => languageSchema.parse(language))
  .handler(({ data: language }) => getRepositories().taxonomy.listTags(language));

export const getTag = createServerFn({ method: "GET" })
  .validator((input: { slug: string; language?: string }) => lookupSchema.parse(input))
  .handler(({ data }) => getRepositories().taxonomy.findTagBySlug(data.slug, data.language));

export const saveTagTranslations = createServerFn({ method: "POST" })
  .validator((input: TagTranslationsInput) => tagTranslationsInputSchema.parse(input))
  .handler(async ({ data }) => {
    await requireMember(editorRoles);
    return getRepositories().taxonomy.saveTagTranslations(data);
  });

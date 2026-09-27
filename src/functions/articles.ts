import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  parseArticleWriteInput,
  type ArticleWriteInput,
  type PublishedArticleFilter,
  type WriteContext,
} from "@/data/articles/article-repository";
import { editorRoles } from "@/domain/permissions";
import type { SessionUser } from "@/lib/auth-types";
import { requireMember } from "@/server/auth";
import { getRepositories } from "@/server/repositories";

const slugSchema = z.string().trim().min(1).max(200);
const idSchema = z.string().trim().min(1).max(100);
const filterSchema = z
  .object({
    categorySlug: slugSchema.optional(),
    tagSlug: slugSchema.optional(),
    authorSlug: slugSchema.optional(),
  })
  .strict();

const contextOf = (user: SessionUser): WriteContext => ({
  actorId: user.id,
  actorRole: user.role,
});

export const listPublishedArticles = createServerFn({ method: "GET" })
  .validator((filter: PublishedArticleFilter | undefined) => {
    const parsed = filterSchema.parse(filter ?? {});
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value !== undefined),
    ) as PublishedArticleFilter;
  })
  .handler(({ data: filter }) => getRepositories().articles.listPublished(filter));

export const getPublishedArticle = createServerFn({ method: "GET" })
  .validator((slug: string) => slugSchema.parse(slug))
  .handler(({ data: slug }) => getRepositories().articles.findPublishedBySlug(slug));

export const listAdminArticles = createServerFn({ method: "GET" }).handler(async () => {
  await requireMember();
  return getRepositories().articles.listAdmin();
});

export const getAdminArticle = createServerFn({ method: "GET" })
  .validator((slug: string) => slugSchema.parse(slug))
  .handler(async ({ data: slug }) => {
    await requireMember();
    return getRepositories().articles.findAdminBySlug(slug);
  });

export const saveArticle = createServerFn({ method: "POST" })
  .validator((input: ArticleWriteInput) => parseArticleWriteInput(input))
  .handler(async ({ data }) => {
    const user = await requireMember();
    return getRepositories().articles.save(data, contextOf(user));
  });

export const duplicateArticle = createServerFn({ method: "POST" })
  .validator((id: string) => idSchema.parse(id))
  .handler(async ({ data: id }) => {
    const user = await requireMember();
    return getRepositories().articles.duplicate(id, contextOf(user));
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .validator((id: string) => idSchema.parse(id))
  .handler(async ({ data: id }) => {
    await requireMember(editorRoles);
    await getRepositories().articles.delete(id);
  });

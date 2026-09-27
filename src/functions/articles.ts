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
const languageSchema = z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/);
const filterSchema = z
  .object({
    language: languageSchema.optional(),
    categorySlug: slugSchema.optional(),
    tagSlug: slugSchema.optional(),
    authorSlug: slugSchema.optional(),
    minMinutes: z.number().int().min(0).max(1000).optional(),
    maxMinutes: z.number().int().min(0).max(1000).optional(),
  })
  .strict();
const pageSchema = z.number().int().min(1).max(10_000).default(1);

/** Drops keys set to undefined (exactOptionalPropertyTypes). */
const withoutUndefined = (value: object): PublishedArticleFilter =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as PublishedArticleFilter;

const contextOf = (user: SessionUser): WriteContext => ({
  actorId: user.id,
  actorRole: user.role,
});

export const listPublishedArticles = createServerFn({ method: "GET" })
  .validator((filter: (PublishedArticleFilter & { limit?: number }) | undefined) => {
    const parsed = filterSchema
      .extend({ limit: z.number().int().min(1).max(50).optional() })
      .parse(filter ?? {});
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value !== undefined),
    ) as PublishedArticleFilter & { limit?: number };
  })
  .handler(({ data: filter }) => getRepositories().articles.listPublished(filter));

export const getPublishedArticle = createServerFn({ method: "GET" })
  .validator((input: { slug: string; language?: string }) =>
    z.object({ slug: slugSchema, language: languageSchema.optional() }).strict().parse(input),
  )
  .handler(({ data }) => getRepositories().articles.findPublishedBySlug(data.slug, data.language));

export const listAdminArticles = createServerFn({ method: "GET" }).handler(async () => {
  await requireMember();
  return getRepositories().articles.listAdmin();
});

export const getAdminArticle = createServerFn({ method: "GET" })
  .validator((id: string) => idSchema.parse(id))
  .handler(async ({ data: id }) => {
    await requireMember();
    return getRepositories().articles.findAdminById(id);
  });

export const createArticleTranslation = createServerFn({ method: "POST" })
  .validator((input: { sourceId: string; language: string }) =>
    z.object({ sourceId: idSchema, language: languageSchema }).strict().parse(input),
  )
  .handler(async ({ data }) => {
    const user = await requireMember();
    return getRepositories().articles.createTranslation(
      data.sourceId,
      data.language,
      contextOf(user),
    );
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

export const pagePublishedArticles = createServerFn({ method: "GET" })
  .validator((input: { filter?: PublishedArticleFilter; page?: number }) =>
    z.object({ filter: filterSchema.optional(), page: pageSchema }).strict().parse(input),
  )
  .handler(({ data }) =>
    getRepositories().articles.pagePublished(withoutUndefined(data.filter ?? {}), data.page),
  );

export const searchPublishedArticles = createServerFn({ method: "GET" })
  .validator((input: { query: string; filter?: PublishedArticleFilter; page?: number }) =>
    z
      .object({
        query: z.string().trim().min(1).max(200),
        filter: filterSchema.optional(),
        page: pageSchema,
      })
      .strict()
      .parse(input),
  )
  .handler(({ data }) =>
    getRepositories().articles.search(data.query, withoutUndefined(data.filter ?? {}), data.page),
  );

export const listPopularArticles = createServerFn({ method: "GET" })
  .validator((input: { language?: string; limit?: number }) =>
    z
      .object({
        language: languageSchema.optional(),
        limit: z.number().int().min(1).max(50).default(5),
      })
      .strict()
      .parse(input),
  )
  .handler(({ data }) => getRepositories().articles.listPopular(data.language, data.limit));

export const resolveOldArticleSlug = createServerFn({ method: "GET" })
  .validator((input: { slug: string; language?: string }) =>
    z.object({ slug: slugSchema, language: languageSchema.optional() }).strict().parse(input),
  )
  .handler(({ data }) => getRepositories().articles.resolveOldSlug(data.slug, data.language));

/** Public: counts one view (the page calls it once per article per session). */
export const recordArticleView = createServerFn({ method: "POST" })
  .validator((articleId: string) => idSchema.parse(articleId))
  .handler(async ({ data }) => {
    await getRepositories().articles.recordView(data);
  });

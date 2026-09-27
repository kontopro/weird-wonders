import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseArticleWriteInput, type ArticleWriteInput } from "@/data/articles/article-repository";
import { getArticleRepository } from "@/server/article-repository";
import { requireMember } from "@/server/auth";

const slugSchema = z.string().trim().min(1).max(200);
const idSchema = z.string().trim().min(1).max(100);

export const listPublishedArticles = createServerFn({ method: "GET" }).handler(() =>
  getArticleRepository().listPublished(),
);

export const getPublishedArticle = createServerFn({ method: "GET" })
  .validator((slug: string) => slugSchema.parse(slug))
  .handler(({ data: slug }) => getArticleRepository().findPublishedBySlug(slug));

export const listAdminArticles = createServerFn({ method: "GET" }).handler(async () => {
  await requireMember();
  return getArticleRepository().listAdmin();
});

export const getAdminArticle = createServerFn({ method: "GET" })
  .validator((slug: string) => slugSchema.parse(slug))
  .handler(async ({ data: slug }) => {
    await requireMember();
    return getArticleRepository().findAdminBySlug(slug);
  });

export const saveArticle = createServerFn({ method: "POST" })
  .validator((input: ArticleWriteInput) => parseArticleWriteInput(input))
  .handler(async ({ data }) => {
    await requireMember();
    return getArticleRepository().save(data);
  });

export const duplicateArticle = createServerFn({ method: "POST" })
  .validator((id: string) => idSchema.parse(id))
  .handler(async ({ data: id }) => {
    await requireMember();
    return getArticleRepository().duplicate(id);
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .validator((id: string) => idSchema.parse(id))
  .handler(async ({ data: id }) => {
    await requireMember(["owner", "admin", "editor"]);
    await getArticleRepository().delete(id);
  });

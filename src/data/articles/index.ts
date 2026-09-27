import {
  listPopularArticles,
  pagePublishedArticles,
  recordArticleView,
  resolveOldArticleSlug,
  searchPublishedArticles,
  createArticleTranslation,
  deleteArticle,
  duplicateArticle,
  getAdminArticle,
  getPublishedArticle,
  listAdminArticles,
  listPublishedArticles,
  saveArticle,
} from "@/functions/articles";

import type { PublishedArticleFilter } from "@/data/articles/article-repository";

export type {
  ArticleDetail,
  ArticleWriteInput,
  EditableArticle,
  PublishedArticleFilter,
} from "@/data/articles/article-repository";

/**
 * Isomorphic entry point for pages and components. Every call runs on the
 * server (as a server function), where the acting user is resolved from the
 * session — callers never pass identity or roles.
 */
export const articleApi = {
  listPublished: (filter?: PublishedArticleFilter & { limit?: number }) =>
    listPublishedArticles({ data: filter }),
  findPublishedBySlug: (slug: string, language?: string) =>
    getPublishedArticle({ data: { slug, ...(language ? { language } : {}) } }),
  pagePublished: (filter: PublishedArticleFilter, page = 1) =>
    pagePublishedArticles({ data: { filter, page } }),
  search: (query: string, filter: PublishedArticleFilter, page = 1) =>
    searchPublishedArticles({ data: { query, filter, page } }),
  listPopular: (language?: string, limit = 5) =>
    listPopularArticles({ data: { ...(language ? { language } : {}), limit } }),
  resolveOldSlug: (slug: string, language?: string) =>
    resolveOldArticleSlug({ data: { slug, ...(language ? { language } : {}) } }),
  recordView: (articleId: string) => recordArticleView({ data: articleId }),
  listAdmin: () => listAdminArticles(),
  findAdminById: (id: string) => getAdminArticle({ data: id }),
  createTranslation: (sourceId: string, language: string) =>
    createArticleTranslation({ data: { sourceId, language } }),
  save: (input: Parameters<typeof saveArticle>[0]["data"]) => saveArticle({ data: input }),
  duplicate: (id: string) => duplicateArticle({ data: id }),
  delete: (id: string) => deleteArticle({ data: id }),
};

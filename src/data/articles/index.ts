import {
  createArticleTranslation,
  deleteArticle,
  duplicateArticle,
  getAdminArticle,
  getPublishedArticle,
  listAdminArticles,
  listPublishedArticles,
  saveArticle,
} from "@/functions/articles";

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
  listPublished: (filter?: {
    language?: string;
    categorySlug?: string;
    tagSlug?: string;
    authorSlug?: string;
  }) => listPublishedArticles({ data: filter }),
  findPublishedBySlug: (slug: string, language?: string) =>
    getPublishedArticle({ data: { slug, ...(language ? { language } : {}) } }),
  listAdmin: () => listAdminArticles(),
  findAdminById: (id: string) => getAdminArticle({ data: id }),
  createTranslation: (sourceId: string, language: string) =>
    createArticleTranslation({ data: { sourceId, language } }),
  save: (input: Parameters<typeof saveArticle>[0]["data"]) => saveArticle({ data: input }),
  duplicate: (id: string) => duplicateArticle({ data: id }),
  delete: (id: string) => deleteArticle({ data: id }),
};

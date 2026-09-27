import type { ArticleRepository } from "@/data/articles/article-repository";
import {
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
  ArticleRepository,
  ArticleWriteInput,
  EditableArticle,
} from "@/data/articles/article-repository";

/**
 * Isomorphic entry point for pages and components. Every call runs on the
 * server (as a server function), where the repository is created per request.
 */
export const articleRepository: ArticleRepository = {
  listPublished: () => listPublishedArticles(),
  findPublishedBySlug: (slug) => getPublishedArticle({ data: slug }),
  listAdmin: () => listAdminArticles(),
  findAdminBySlug: (slug) => getAdminArticle({ data: slug }),
  save: (input) => saveArticle({ data: input }),
  duplicate: (id) => duplicateArticle({ data: id }),
  delete: (id) => deleteArticle({ data: id }),
};

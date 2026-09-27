import type { AuthorRef } from "@/domain/authors";
import type { CategoryRef } from "@/domain/taxonomy";

import type { ArticleStatus } from "@/domain/article-status";

export { articleStatuses, articleStatusLabels, type ArticleStatus } from "@/domain/article-status";

export type AdminArticle = {
  id: string;
  slug: string;
  language: string;
  title: string;
  excerpt: string;
  category: CategoryRef;
  author: AuthorRef;
  status: ArticleStatus;
  date: string;
  dateValue: string;
  views: number;
  image: string;
};

export const formatViews = (views: number) => views.toLocaleString("el-GR");

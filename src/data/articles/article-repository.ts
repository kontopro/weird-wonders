import type { ArticleContentDocument } from "@/lib/article-content";
import type { AdminArticle, ArticleStatus } from "@/lib/admin-data";
import type { Article, Category } from "@/lib/articles";

export type ArticleDetail = Article & {
  content: ArticleContentDocument;
};

export type ArticleWriteInput = {
  id?: string;
  authorId?: string;
  slug: string;
  title: string;
  excerpt: string;
  category: Category;
  status: ArticleStatus;
  dateValue: string;
  image?: string;
  content: ArticleContentDocument;
  seoTitle?: string;
  seoDescription?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isFactOfDay?: boolean;
};

export interface ArticleRepository {
  listPublished(): Promise<Article[]>;
  findPublishedBySlug(slug: string): Promise<ArticleDetail | null>;
  listAdmin(): Promise<AdminArticle[]>;
  findAdminBySlug(slug: string): Promise<AdminArticle | null>;
  save(input: ArticleWriteInput): Promise<AdminArticle>;
  duplicate(id: string): Promise<AdminArticle>;
  delete(id: string): Promise<void>;
}

import type { ArticleContentDocument } from "@/lib/article-content";
import type { AdminArticle, ArticleStatus } from "@/lib/admin-data";
import type { Article, Category } from "@/lib/articles";

export type ArticleDetail = Article & {
  content: ArticleContentDocument;
  mediaAssets: Record<string, { src: string; width?: number; height?: number }>;
};

export type EditableArticle = AdminArticle & {
  authorId?: string;
  content: ArticleContentDocument;
  imageAlt: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  isTrending: boolean;
  isFactOfDay: boolean;
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
  imageAlt?: string;
  tags?: string[];
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
  findAdminBySlug(slug: string): Promise<EditableArticle | null>;
  save(input: ArticleWriteInput): Promise<EditableArticle>;
  duplicate(id: string): Promise<EditableArticle>;
  delete(id: string): Promise<void>;
}

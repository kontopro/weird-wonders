import { z } from "zod";
import { articleContentDocumentSchema, type ArticleContentDocument } from "@/lib/article-content";
import { articleStatuses, type AdminArticle, type ArticleStatus } from "@/lib/admin-data";
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

const articleWriteInputSchema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    authorId: z.string().uuid().optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(200),
    title: z.string().trim().min(1).max(200),
    excerpt: z.string().max(500),
    category: z.string().min(1).max(100),
    status: z.enum(articleStatuses),
    dateValue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    image: z.string().max(2048).optional(),
    imageAlt: z.string().max(500).optional(),
    tags: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    content: articleContentDocumentSchema,
    seoTitle: z.string().max(60).optional(),
    seoDescription: z.string().max(160).optional(),
    isFeatured: z.boolean().optional(),
    isTrending: z.boolean().optional(),
    isFactOfDay: z.boolean().optional(),
  })
  .strict();

/** Validates untrusted input (e.g. a server function payload) before any write. */
export function parseArticleWriteInput(input: unknown): ArticleWriteInput {
  const parsed = articleWriteInputSchema.parse(input);
  // Drop keys explicitly set to undefined so the result satisfies exactOptionalPropertyTypes.
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  ) as ArticleWriteInput;
}

export function assertArticleWriteInvariants(input: ArticleWriteInput) {
  if (input.isFactOfDay && input.status !== "Δημοσιευμένο") {
    throw new Error(`Το FACTάκι της ημέρας πρέπει να είναι δημοσιευμένο.`);
  }
}

export interface ArticleRepository {
  listPublished(): Promise<Article[]>;
  findPublishedBySlug(slug: string): Promise<ArticleDetail | null>;
  listAdmin(): Promise<AdminArticle[]>;
  findAdminBySlug(slug: string): Promise<EditableArticle | null>;
  save(input: ArticleWriteInput): Promise<EditableArticle>;
  duplicate(id: string): Promise<EditableArticle>;
  delete(id: string): Promise<void>;
}

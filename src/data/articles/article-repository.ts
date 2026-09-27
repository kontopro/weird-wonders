import { z } from "zod";
import type { MemberRole } from "@/lib/auth-types";
import { articleContentDocumentSchema, type ArticleContentDocument } from "@/lib/article-content";
import { articleStatuses, type AdminArticle, type ArticleStatus } from "@/lib/admin-data";
import type { Article } from "@/lib/articles";
import { isSlug } from "@/lib/slug";
import type { TagRef } from "@/domain/taxonomy";

export type ArticleDetail = Article & {
  content: ArticleContentDocument;
  mediaAssets: Record<string, { src: string; width?: number; height?: number }>;
};

export type EditableArticle = AdminArticle & {
  authorId: string | null;
  content: ArticleContentDocument;
  imageAlt: string;
  tags: TagRef[];
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  isTrending: boolean;
  isFactOfDay: boolean;
};

export type ArticleWriteInput = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  categorySlug: string;
  status: ArticleStatus;
  dateValue: string;
  image?: string;
  imageAlt?: string;
  /** Tag display names; each adapter resolves or creates them by slug. */
  tags?: string[];
  content: ArticleContentDocument;
  seoTitle?: string;
  seoDescription?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isFactOfDay?: boolean;
};

export type PublishedArticleFilter = {
  categorySlug?: string;
  tagSlug?: string;
  authorSlug?: string;
};

/** Who performs a write. Adapters use it for authorship and role rules. */
export type WriteContext = { actorId: string; actorRole: MemberRole };

const articleWriteInputSchema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    slug: z.string().refine(isSlug, "Μη έγκυρο slug."),
    title: z.string().trim().min(1).max(200),
    excerpt: z.string().max(500),
    categorySlug: z.string().refine(isSlug, "Μη έγκυρη κατηγορία."),
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
  listPublished(filter?: PublishedArticleFilter): Promise<Article[]>;
  findPublishedBySlug(slug: string): Promise<ArticleDetail | null>;
  listAdmin(): Promise<AdminArticle[]>;
  findAdminBySlug(slug: string): Promise<EditableArticle | null>;
  save(input: ArticleWriteInput, context: WriteContext): Promise<EditableArticle>;
  duplicate(id: string, context: WriteContext): Promise<EditableArticle>;
  delete(id: string): Promise<void>;
}

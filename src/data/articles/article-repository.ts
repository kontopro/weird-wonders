import { messages } from "@/config/messages";
import { mainLanguage } from "@/config/site";
import { z } from "zod";
import type { MemberRole } from "@/lib/auth-types";
import { articleContentDocumentSchema, type ArticleContentDocument } from "@/lib/article-content";
import { articleStatuses, type AdminArticle, type ArticleStatus } from "@/lib/admin-data";
import type { Article } from "@/lib/articles";
import { isSlug } from "@/lib/slug";
import type { TagRef } from "@/domain/taxonomy";

/** Another language version of the same piece, as the public site may link to it. */
export type PublicArticleVersion = { language: string; slug: string };

/** Another language version, as the admin sees it (drafts included). */
export type ArticleVersion = PublicArticleVersion & {
  id: string;
  title: string;
  status: ArticleStatus;
};

export type ArticleDetail = Article & {
  content: ArticleContentDocument;
  mediaAssets: Record<string, { src: string; width?: number; height?: number }>;
  /** Published versions in other languages (for the language switch and hreflang). */
  translations: PublicArticleVersion[];
};

export type EditableArticle = AdminArticle & {
  authorId: string | null;
  /** Media library id of the cover image; `image` holds its URL for previews. */
  coverAssetId: string | null;
  language: string;
  /** Shared by all language versions of the same piece. */
  translationGroupId: string;
  /** The other language versions of this piece. */
  translations: ArticleVersion[];
  content: ArticleContentDocument;
  imageAlt: string;
  tags: TagRef[];
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  isTrending: boolean;
  isHighlighted: boolean;
};

export type ArticleWriteInput = {
  id?: string;
  slug: string;
  /** Defaults to the blog's main language. */
  language?: string;
  /** Set to create a translation of an existing piece; omitted for new pieces. */
  translationGroupId?: string;
  title: string;
  excerpt: string;
  categorySlug: string;
  status: ArticleStatus;
  dateValue: string;
  /** Media library id of the cover; `null` removes it. */
  coverAssetId?: string | null;
  imageAlt?: string;
  /** Tag display names; each adapter resolves or creates them by slug. */
  tags?: string[];
  content: ArticleContentDocument;
  seoTitle?: string;
  seoDescription?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isHighlighted?: boolean;
};

export type PublishedArticleFilter = {
  /** Defaults to the blog's main language. */
  language?: string;
  categorySlug?: string;
  tagSlug?: string;
  authorSlug?: string;
};

/** Who performs a write. Adapters use it for authorship and role rules. */
export type WriteContext = { actorId: string; actorRole: MemberRole };

const articleWriteInputSchema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    language: z
      .string()
      .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/)
      .optional(),
    translationGroupId: z.string().min(1).max(100).optional(),
    slug: z.string().refine(isSlug, "Μη έγκυρο slug."),
    title: z.string().trim().min(1).max(200),
    excerpt: z.string().max(500),
    categorySlug: z.string().refine(isSlug, "Μη έγκυρη κατηγορία."),
    status: z.enum(articleStatuses),
    dateValue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    coverAssetId: z.string().min(1).max(100).nullable().optional(),
    imageAlt: z.string().max(500).optional(),
    tags: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    content: articleContentDocumentSchema,
    seoTitle: z.string().max(60).optional(),
    seoDescription: z.string().max(160).optional(),
    isFeatured: z.boolean().optional(),
    isTrending: z.boolean().optional(),
    isHighlighted: z.boolean().optional(),
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
  if (input.isHighlighted && input.status !== "published") {
    throw new Error(
      `${messages[mainLanguage]?.site.contentLabels.highlight ?? "Highlight"}: μόνο δημοσιευμένο άρθρο.`,
    );
  }
}

export interface ArticleRepository {
  listPublished(filter?: PublishedArticleFilter): Promise<Article[]>;
  /** A public article by its slug in a language (default: the main language). */
  findPublishedBySlug(slug: string, language?: string): Promise<ArticleDetail | null>;
  listAdmin(): Promise<AdminArticle[]>;
  findAdminById(id: string): Promise<EditableArticle | null>;
  save(input: ArticleWriteInput, context: WriteContext): Promise<EditableArticle>;
  duplicate(id: string, context: WriteContext): Promise<EditableArticle>;
  /**
   * Starts a translation: a draft copy of the article in another language,
   * linked to it (same translation group), for the actor to translate.
   */
  createTranslation(
    sourceId: string,
    language: string,
    context: WriteContext,
  ): Promise<EditableArticle>;
  delete(id: string): Promise<void>;
}

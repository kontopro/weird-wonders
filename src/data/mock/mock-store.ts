import type { ArticleStatus } from "@/lib/admin-data";
import { scheduledAtFor } from "@/domain/publishing";
import type { ArticleContentDocument } from "@/lib/article-content";
import type { CategoryIconKey, TaxonomyTranslation } from "@/domain/taxonomy";
import type { MemberRole } from "@/lib/auth-types";

/**
 * In-memory tables for mock mode, shaped like the database schema so that the
 * mock adapter exercises the same relations (and the same rules) as Supabase.
 */
export type MockStore = {
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    iconKey: CategoryIconKey | null;
    sortOrder: number;
  }>;
  tags: Array<{ id: string; slug: string; name: string }>;
  /** Like `public.category_translations` / `public.tag_translations`. */
  categoryTranslations: Array<TaxonomyTranslation & { categoryId: string }>;
  tagTranslations: Array<TaxonomyTranslation & { tagId: string }>;
  profiles: Array<{ id: string; slug: string; displayName: string; bio: string }>;
  /** Media library, like `public.media_assets` (+ Storage for uploaded bytes). */
  media: Array<{
    id: string;
    /** Static demo file (`/demo/…`) or, for uploads, the demo media route. */
    src: string;
    /** Uploaded bytes, kept in memory; absent for static demo files. */
    bytes?: Uint8Array;
    width: number | null;
    height: number | null;
    mimeType: string;
    sizeBytes: number | null;
    alt: string;
    caption: string;
    uploadedBy: string | null;
    createdAt: string;
  }>;
  /** Editorial team access, like `public.members`. */
  members: Array<{
    userId: string;
    /** In production the e-mail lives on the Auth account; mock keeps it here. */
    email: string;
    role: MemberRole;
    status: "active" | "suspended";
  }>;
  articles: Array<{
    id: string;
    slug: string;
    language: string;
    translationGroupId: string;
    title: string;
    excerpt: string;
    categoryId: string | null;
    authorId: string | null;
    tagIds: string[];
    status: ArticleStatus;
    dateValue: string;
    coverAssetId: string | null;
    imageAlt: string;
    content: ArticleContentDocument;
    seoTitle: string;
    seoDescription: string;
    isFeatured: boolean;
    isTrending: boolean;
    isHighlighted: boolean;
    views: number;
    popularity: number;
    /** Demo override; otherwise calculated from the content. */
    minutes?: number;
  }>;
};

export type MockArticleRow = MockStore["articles"][number];

/** Adapts a mock row to the shared scheduling rules (`src/domain/publishing.ts`). */
export function scheduleOf(row: Pick<MockArticleRow, "status" | "dateValue">) {
  return {
    status: row.status,
    scheduledAt: row.status === "scheduled" ? scheduledAtFor(row.dateValue) : null,
  };
}

import type { ArticleStatus } from "@/lib/admin-data";
import type { ArticleContentDocument } from "@/lib/article-content";
import type { CategoryIconKey } from "@/domain/taxonomy";

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
  profiles: Array<{ id: string; slug: string; displayName: string; bio: string }>;
  articles: Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    categoryId: string | null;
    authorId: string | null;
    tagIds: string[];
    status: ArticleStatus;
    dateValue: string;
    image: string;
    imageAlt: string;
    content: ArticleContentDocument;
    seoTitle: string;
    seoDescription: string;
    isFeatured: boolean;
    isTrending: boolean;
    isFactOfDay: boolean;
    views: number;
    popularity: number;
    /** Demo override; otherwise calculated from the content. */
    minutes?: number;
  }>;
};

export type MockArticleRow = MockStore["articles"][number];

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertArticleWriteInvariants,
  type ArticleRepository,
  type ArticleWriteInput,
  type EditableArticle,
  type PublishedArticleFilter,
  type WriteContext,
} from "@/data/articles/article-repository";
import { toDomainError } from "@/data/supabase/supabase-errors";
import { publiclyVisibleFilter } from "@/data/supabase/visibility";
import { editorialTeam, type AuthorRef } from "@/domain/authors";
import { DomainError } from "@/domain/errors";
import { isEditorRole } from "@/domain/permissions";
import { effectiveStatus, scheduledAtFor } from "@/domain/publishing";
import {
  findMatchingTag,
  newTagForbiddenMessage,
  toCategoryIconKey,
  uncategorized,
  type CategoryRef,
  type TagRef,
} from "@/domain/taxonomy";
import type { AdminArticle, ArticleStatus } from "@/lib/admin-data";
import { calculateReadingTimeMinutes, parseArticleContent } from "@/lib/article-content";
import type { Article } from "@/lib/articles";
import { formatArticleDate } from "@/lib/format";
import { slugify } from "@/lib/slug";

type MediaRow = {
  id?: string;
  storage_bucket: string;
  storage_path: string;
  visibility: string;
  width: number | null;
  height: number | null;
};

type ArticleRow = {
  id: string;
  author_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content_blocks?: unknown;
  cover_image_alt: string | null;
  status: ArticleStatus;
  is_featured: boolean;
  is_trending: boolean;
  is_highlighted: boolean;
  scheduled_at: string | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_time_minutes: number | null;
  created_at: string;
  updated_at: string;
  category: { slug: string; name: string; icon_key: string | null } | null;
  cover: MediaRow | null;
  article_tags: Array<{ tag: { slug: string; name: string } | null }>;
};

const toTagInputs = (names: string[]) =>
  names.flatMap((name) => {
    const slug = slugify(name);
    return slug ? [{ slug, name: name.trim() }] : [];
  });

// Status codes are identical in the domain and the database; no mapping needed.
// `public_at` (generated: published_at ?? scheduled_at) orders public lists.

// Relations are embedded in one request. The cover FK is named because
// `articles` has two foreign keys to `media_assets` (cover and social image).
const LIST_COLUMNS = [
  "id, author_id, title, slug, excerpt, cover_image_alt, status, is_featured, is_trending",
  "is_highlighted, scheduled_at, published_at, seo_title, seo_description, reading_time_minutes",
  "created_at, updated_at",
  "category:categories(slug, name, icon_key)",
  "cover:media_assets!articles_cover_image_id_fkey(storage_bucket, storage_path, visibility, width, height)",
  "article_tags(tag:tags(slug, name))",
].join(", ");
const DETAIL_COLUMNS = `${LIST_COLUMNS}, content_blocks`;

const toDateValue = (row: ArticleRow) =>
  (row.published_at ?? row.scheduled_at ?? row.updated_at ?? row.created_at).slice(0, 10);

/** Finds every `assetId` referenced inside the content blocks. */
function collectAssetIds(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectAssetIds(item, found);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "assetId" && typeof item === "string") found.add(item);
      else collectAssetIds(item, found);
    }
  }
  return found;
}

export class SupabaseArticleRepository implements ArticleRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mediaSource(media: MediaRow | null) {
    if (!media || media.visibility !== "public") return null;
    const { data } = this.client.storage
      .from(media.storage_bucket)
      .getPublicUrl(media.storage_path);
    return {
      src: data.publicUrl,
      ...(typeof media.width === "number" ? { width: media.width } : {}),
      ...(typeof media.height === "number" ? { height: media.height } : {}),
    };
  }

  /** Author names come from `profiles`, which anonymous visitors may read for published authors. */
  private async loadAuthors(rows: ArticleRow[]): Promise<Map<string, AuthorRef>> {
    const ids = [...new Set(rows.flatMap((row) => (row.author_id ? [row.author_id] : [])))];
    if (ids.length === 0) return new Map();
    const { data, error } = await this.client
      .from("profiles")
      .select("id, slug, display_name")
      .in("id", ids);
    if (error) throw error;
    return new Map(
      (data ?? []).map((row) => [
        String(row.id),
        { slug: String(row.slug), name: String(row.display_name) },
      ]),
    );
  }

  private categoryRef(row: ArticleRow): CategoryRef {
    return row.category
      ? {
          slug: row.category.slug,
          name: row.category.name,
          iconKey: toCategoryIconKey(row.category.icon_key),
        }
      : uncategorized;
  }

  private tagRefs(row: ArticleRow): TagRef[] {
    return row.article_tags.flatMap(({ tag }) => (tag ? [{ slug: tag.slug, name: tag.name }] : []));
  }

  private toPublic(row: ArticleRow, authors: Map<string, AuthorRef>): Article {
    return {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt ?? "",
      date: formatArticleDate(toDateValue(row)),
      minutes: row.reading_time_minutes ?? 1,
      image: this.mediaSource(row.cover)?.src ?? "",
      popularity: row.is_trending ? 1 : 0,
      category: this.categoryRef(row),
      author: (row.author_id && authors.get(row.author_id)) || editorialTeam,
      tags: this.tagRefs(row),
      isFeatured: row.is_featured,
      isHighlighted: row.is_highlighted,
    };
  }

  private toAdmin(row: ArticleRow, authors: Map<string, AuthorRef>): AdminArticle {
    const article = this.toPublic(row, authors);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: article.excerpt,
      category: article.category,
      author: article.author,
      status: effectiveStatus({ status: row.status, scheduledAt: row.scheduled_at }),
      date: article.date,
      dateValue: toDateValue(row),
      views: 0,
      image: article.image,
    };
  }

  private toEditable(row: ArticleRow, authors: Map<string, AuthorRef>): EditableArticle {
    return {
      ...this.toAdmin(row, authors),
      authorId: row.author_id,
      content: parseArticleContent(row.content_blocks),
      imageAlt: row.cover_image_alt ?? "",
      tags: this.tagRefs(row),
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
      isFeatured: row.is_featured,
      isTrending: row.is_trending,
      isHighlighted: row.is_highlighted,
    };
  }

  /** Resolves a slug to an id; `undefined` means "no filter", `null` means "no match". */
  private async idBySlug(table: "categories" | "tags" | "profiles", slug: string | undefined) {
    if (!slug) return undefined;
    const { data, error } = await this.client
      .from(table)
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? String(data.id) : null;
  }

  async listPublished(filter: PublishedArticleFilter = {}) {
    const [categoryId, tagId, authorId] = await Promise.all([
      this.idBySlug("categories", filter.categorySlug),
      this.idBySlug("tags", filter.tagSlug),
      this.idBySlug("profiles", filter.authorSlug),
    ]);
    if (categoryId === null || tagId === null || authorId === null) return [];

    let query = this.client
      .from("articles")
      .select(LIST_COLUMNS)
      .or(publiclyVisibleFilter())
      .order("public_at", { ascending: false });
    if (categoryId) query = query.eq("category_id", categoryId);
    if (authorId) query = query.eq("author_id", authorId);
    if (tagId) {
      const { data: links, error } = await this.client
        .from("article_tags")
        .select("article_id")
        .eq("tag_id", tagId);
      if (error) throw error;
      const ids = (links ?? []).map((link) => String(link.article_id));
      if (ids.length === 0) return [];
      query = query.in("id", ids);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as unknown as ArticleRow[];
    const authors = await this.loadAuthors(rows);
    return rows.map((row) => this.toPublic(row, authors));
  }

  async findPublishedBySlug(slug: string) {
    const { data, error } = await this.client
      .from("articles")
      .select(DETAIL_COLUMNS)
      .eq("slug", slug)
      .or(publiclyVisibleFilter())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const row = data as unknown as ArticleRow;
    const assetIds = [...collectAssetIds(row.content_blocks)];
    const [authors, media] = await Promise.all([
      this.loadAuthors([row]),
      assetIds.length
        ? this.client
            .from("media_assets")
            .select("id, storage_bucket, storage_path, visibility, width, height")
            .in("id", assetIds)
        : Promise.resolve({ data: [] as MediaRow[], error: null }),
    ]);
    if (media.error) throw media.error;

    const mediaAssets: Record<string, { src: string; width?: number; height?: number }> = {};
    for (const asset of (media.data ?? []) as MediaRow[]) {
      const source = this.mediaSource(asset);
      if (asset.id && source) mediaAssets[asset.id] = source;
    }
    return {
      ...this.toPublic(row, authors),
      content: parseArticleContent(row.content_blocks),
      mediaAssets,
    };
  }

  async listAdmin() {
    const { data, error } = await this.client
      .from("articles")
      .select(LIST_COLUMNS)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as unknown as ArticleRow[];
    const authors = await this.loadAuthors(rows);
    return rows.map((row) => this.toAdmin(row, authors));
  }

  private async findEditable(column: "id" | "slug", value: string) {
    const { data, error } = await this.client
      .from("articles")
      .select(DETAIL_COLUMNS)
      .eq(column, value)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as unknown as ArticleRow;
    return this.toEditable(row, await this.loadAuthors([row]));
  }

  async findAdminBySlug(slug: string) {
    return this.findEditable("slug", slug);
  }

  /**
   * Rejects new tags from authors before anything is written, so a failed save
   * never leaves the article saved without its tags. The database enforces the
   * same rule again inside `public.set_article_tags`.
   */
  private async assertMayUseTags(names: string[], context: WriteContext) {
    if (isEditorRole(context.actorRole) || names.length === 0) return;
    // Tag lists are small for a blog; one read keeps the matching rule in one place.
    const { data, error } = await this.client.from("tags").select("slug, name");
    if (error) throw toDomainError(error, "");
    const existing = (data ?? []) as Array<{ slug: string; name: string }>;
    const missing = toTagInputs(names).find((tag) => !findMatchingTag(existing, tag));
    if (missing) {
      throw new DomainError(`«${missing.name}»: ${newTagForbiddenMessage}`, "forbidden");
    }
  }

  /** Replaces the article's tags atomically (see `public.set_article_tags`). */
  private async setTags(articleId: string, names: string[]) {
    const tags = toTagInputs(names);
    const { error } = await this.client.rpc("set_article_tags", {
      p_article_id: articleId,
      p_tags: tags,
    });
    if (error) {
      throw error.code === "42501"
        ? new DomainError(newTagForbiddenMessage, "forbidden")
        : toDomainError(error, "Διπλή ετικέτα.");
    }
  }

  async save(input: ArticleWriteInput, context: WriteContext) {
    assertArticleWriteInvariants(input);

    const categoryId = await this.idBySlug("categories", input.categorySlug);
    if (!categoryId) throw new DomainError("Η κατηγορία δεν υπάρχει.", "invalid");
    if (input.tags) await this.assertMayUseTags(input.tags, context);

    const databaseStatus = input.status;
    const payload = {
      category_id: categoryId,
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      content_version: input.content.version,
      content_blocks: input.content,
      cover_image_alt: input.imageAlt || null,
      status: databaseStatus,
      scheduled_at: databaseStatus === "scheduled" ? scheduledAtFor(input.dateValue) : null,
      seo_title: input.seoTitle || null,
      seo_description: input.seoDescription || null,
      reading_time_minutes: calculateReadingTimeMinutes(input.content),
      is_featured: input.isFeatured ?? false,
      is_trending: input.isTrending ?? false,
      is_highlighted: input.isHighlighted ?? false,
    };

    const query = input.id
      ? this.client.from("articles").update(payload).eq("id", input.id)
      : this.client.from("articles").insert({ ...payload, author_id: context.actorId });
    const { data, error } = await query.select("id").single();
    if (error) throw toDomainError(error, "Υπάρχει ήδη άρθρο με αυτό το slug.");

    const id = String(data.id);
    if (input.tags) await this.setTags(id, input.tags);

    const saved = await this.findEditable("id", id);
    if (!saved) throw new DomainError("Το άρθρο δεν βρέθηκε μετά την αποθήκευση.", "not_found");
    return saved;
  }

  async duplicate(id: string, context: WriteContext) {
    const source = await this.findEditable("id", id);
    if (!source) throw new DomainError("Το άρθρο δεν βρέθηκε.", "not_found");

    return this.save(
      {
        slug: `${source.slug}-copy-${Date.now()}`,
        title: `${source.title} — αντίγραφο`,
        excerpt: source.excerpt,
        categorySlug: source.category.slug,
        status: "draft",
        dateValue: source.dateValue,
        imageAlt: source.imageAlt,
        tags: source.tags.map((tag) => tag.name),
        content: source.content,
        seoTitle: source.seoTitle,
        seoDescription: source.seoDescription,
      },
      context,
    );
  }

  async delete(id: string) {
    const { error } = await this.client.from("articles").delete().eq("id", id);
    if (error) throw toDomainError(error, "");
  }
}

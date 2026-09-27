import { mainLanguage, siteConfig } from "@/config/site";
import { SupabaseTaxonomyRepository } from "@/data/supabase/supabase-taxonomy-repository";
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
import { collectAssetIds } from "@/domain/media";
import { isEditorRole } from "@/domain/permissions";
import { effectiveStatus, scheduledAtFor } from "@/domain/publishing";
import {
  findMatchingTag,
  localizeTaxonomy,
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
  language: string;
  translation_group_id: string;
  cover_image_id: string | null;
  cover_image_alt: string | null;
  excerpt: string | null;
  content_blocks?: unknown;
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
  category: {
    slug: string;
    name: string;
    icon_key: string | null;
    category_translations: TranslationRow[];
  } | null;
  cover: MediaRow | null;
  article_tags: Array<{
    tag: { id: string; slug: string; name: string; tag_translations: TranslationRow[] } | null;
  }>;
};

type TranslationRow = { language: string; name: string; slug: string };

const asTranslations = (rows: TranslationRow[]) => rows.map((row) => ({ ...row, description: "" }));

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
  "id, author_id, title, slug, language, translation_group_id, excerpt, cover_image_id",
  "cover_image_alt",
  "status, is_featured, is_trending",
  "is_highlighted, scheduled_at, published_at, seo_title, seo_description, reading_time_minutes",
  "created_at, updated_at",
  "category:categories(slug, name, icon_key, category_translations(language, name, slug))",
  "cover:media_assets!articles_cover_image_id_fkey(storage_bucket, storage_path, visibility, width, height)",
  "article_tags(tag:tags(id, slug, name, tag_translations(language, name, slug)))",
].join(", ");
const DETAIL_COLUMNS = `${LIST_COLUMNS}, content_blocks`;

const toDateValue = (row: ArticleRow) =>
  (row.published_at ?? row.scheduled_at ?? row.updated_at ?? row.created_at).slice(0, 10);

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

  /** Category in a language (falling back to the main one). */
  private categoryRef(row: ArticleRow, language: string): CategoryRef {
    if (!row.category) return uncategorized;
    const { slug, name } = localizeTaxonomy(
      row.category,
      asTranslations(row.category.category_translations),
      language,
    );
    return { slug, name, iconKey: toCategoryIconKey(row.category.icon_key) };
  }

  private tagRefs(row: ArticleRow, language: string): TagRef[] {
    return row.article_tags.flatMap(({ tag }) => {
      if (!tag) return [];
      const { slug, name } = localizeTaxonomy(tag, asTranslations(tag.tag_translations), language);
      return [{ slug, name }];
    });
  }

  /** Other language versions of the same piece that the caller may see. */
  private async versionsOf(row: ArticleRow, publicOnly: boolean) {
    let query = this.client
      .from("articles")
      .select("id, slug, language, title, status, scheduled_at")
      .eq("translation_group_id", row.translation_group_id)
      .neq("id", row.id);
    if (publicOnly) query = query.or(publiclyVisibleFilter());
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((item) => ({
      id: String(item.id),
      slug: String(item.slug),
      language: String(item.language),
      title: String(item.title),
      status: effectiveStatus({
        status: item.status as ArticleStatus,
        scheduledAt: (item.scheduled_at as string | null) ?? null,
      }),
    }));
  }

  private toPublic(row: ArticleRow, authors: Map<string, AuthorRef>): Article {
    return {
      slug: row.slug,
      language: row.language,
      title: row.title,
      excerpt: row.excerpt ?? "",
      date: formatArticleDate(toDateValue(row)),
      dateValue: toDateValue(row),
      minutes: row.reading_time_minutes ?? 1,
      image: this.mediaSource(row.cover)?.src ?? "",
      imageAlt: row.cover_image_alt ?? "",
      popularity: row.is_trending ? 1 : 0,
      category: this.categoryRef(row, row.language),
      author: (row.author_id && authors.get(row.author_id)) || editorialTeam,
      tags: this.tagRefs(row, row.language),
      isFeatured: row.is_featured,
      isHighlighted: row.is_highlighted,
    };
  }

  private toAdmin(row: ArticleRow, authors: Map<string, AuthorRef>): AdminArticle {
    // The admin always works with main-language category and tag names.
    const article = this.toPublic(row, authors);
    return {
      id: row.id,
      slug: row.slug,
      language: row.language,
      title: row.title,
      excerpt: article.excerpt,
      category: this.categoryRef(row, mainLanguage),
      author: article.author,
      status: effectiveStatus({ status: row.status, scheduledAt: row.scheduled_at }),
      date: article.date,
      dateValue: toDateValue(row),
      views: 0,
      image: article.image,
    };
  }

  private toEditable(
    row: ArticleRow,
    authors: Map<string, AuthorRef>,
    translations: EditableArticle["translations"],
  ): EditableArticle {
    return {
      ...this.toAdmin(row, authors),
      translations,
      authorId: row.author_id,
      coverAssetId: row.cover_image_id,
      language: row.language,
      translationGroupId: row.translation_group_id,
      content: parseArticleContent(row.content_blocks),
      imageAlt: row.cover_image_alt ?? "",
      tags: this.tagRefs(row, mainLanguage),
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

  /** Category/tag slugs are matched in the requested language (see the taxonomy adapter). */
  private async taxonomyId(kind: "category" | "tag", slug: string | undefined, language: string) {
    if (!slug) return undefined;
    const taxonomy = new SupabaseTaxonomyRepository(this.client);
    const found =
      kind === "category"
        ? await taxonomy.findCategoryBySlug(slug, language)
        : await taxonomy.findTagBySlug(slug, language);
    return found?.id ?? null;
  }

  async listPublished(filter: PublishedArticleFilter = {}) {
    const language = filter.language ?? mainLanguage;
    const [categoryId, tagId, authorId] = await Promise.all([
      this.taxonomyId("category", filter.categorySlug, language),
      this.taxonomyId("tag", filter.tagSlug, language),
      this.idBySlug("profiles", filter.authorSlug),
    ]);
    if (categoryId === null || tagId === null || authorId === null) return [];

    let query = this.client
      .from("articles")
      .select(LIST_COLUMNS)
      .eq("language", language)
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

  async findPublishedBySlug(slug: string, language = mainLanguage) {
    const { data, error } = await this.client
      .from("articles")
      .select(DETAIL_COLUMNS)
      .eq("slug", slug)
      .eq("language", language)
      .or(publiclyVisibleFilter())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const row = data as unknown as ArticleRow;
    const assetIds = [...collectAssetIds(row.content_blocks)];
    const [authors, media, versions] = await Promise.all([
      this.loadAuthors([row]),
      assetIds.length
        ? this.client
            .from("media_assets")
            .select("id, storage_bucket, storage_path, visibility, width, height")
            .in("id", assetIds)
        : Promise.resolve({ data: [] as MediaRow[], error: null }),
      this.versionsOf(row, true),
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
      translations: versions.map(({ language: version, slug: versionSlug }) => ({
        language: version,
        slug: versionSlug,
      })),
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

  private async findEditable(id: string) {
    const { data, error } = await this.client
      .from("articles")
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as unknown as ArticleRow;
    const [authors, versions] = await Promise.all([
      this.loadAuthors([row]),
      this.versionsOf(row, false),
    ]);
    return this.toEditable(row, authors, versions);
  }

  async findAdminById(id: string) {
    return this.findEditable(id);
  }

  async createTranslation(sourceId: string, language: string, context: WriteContext) {
    const { data: source, error: readError } = await this.client
      .from("articles")
      .select("*, article_tags(tag_id)")
      .eq("id", sourceId)
      .maybeSingle();
    if (readError) throw toDomainError(readError, "");
    if (!source) throw new DomainError("Το άρθρο δεν βρέθηκε.", "not_found");
    if (!siteConfig.languages.includes(language) || language === source.language) {
      throw new DomainError("Μη έγκυρη γλώσσα μετάφρασης.", "invalid");
    }

    // Keep the slug when it is free in that language (slugs are unique per language).
    const { data: taken, error: slugError } = await this.client
      .from("articles")
      .select("slug")
      .eq("language", language)
      .like("slug", `${source.slug}%`);
    if (slugError) throw toDomainError(slugError, "");
    const used = new Set((taken ?? []).map((row) => String(row.slug)));
    let slug = String(source.slug);
    for (let n = 2; used.has(slug); n++) slug = `${source.slug}-${n}`;

    const { data, error } = await this.client
      .from("articles")
      .insert({
        language,
        translation_group_id: source.translation_group_id,
        slug,
        author_id: context.actorId,
        category_id: source.category_id,
        title: source.title,
        excerpt: source.excerpt,
        content_version: source.content_version,
        content_blocks: source.content_blocks,
        cover_image_id: source.cover_image_id,
        cover_image_alt: source.cover_image_alt,
        reading_time_minutes: source.reading_time_minutes,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw toDomainError(error, "Υπάρχει ήδη εκδοχή του άρθρου σε αυτή τη γλώσσα.");

    const id = String(data.id);
    const tagIds = ((source.article_tags ?? []) as Array<{ tag_id: string }>).map(
      (link) => link.tag_id,
    );
    if (tagIds.length) {
      const { error: tagError } = await this.client
        .from("article_tags")
        .insert(tagIds.map((tagId) => ({ article_id: id, tag_id: tagId })));
      if (tagError) throw toDomainError(tagError, "");
    }
    const created = await this.findEditable(id);
    if (!created) throw new DomainError("Η μετάφραση δεν βρέθηκε.", "not_found");
    return created;
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
      ...(input.language ? { language: input.language } : {}),
      title: input.title,
      excerpt: input.excerpt,
      content_version: input.content.version,
      content_blocks: input.content,
      ...(input.coverAssetId !== undefined ? { cover_image_id: input.coverAssetId } : {}),
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
      : this.client.from("articles").insert({
          language: mainLanguage,
          ...payload,
          ...(input.translationGroupId ? { translation_group_id: input.translationGroupId } : {}),
          author_id: context.actorId,
        });
    const { data, error } = await query.select("id").single();
    if (error) throw toDomainError(error, "Υπάρχει ήδη άρθρο με αυτό το slug.");

    const id = String(data.id);
    if (input.tags) await this.setTags(id, input.tags);

    const saved = await this.findEditable(id);
    if (!saved) throw new DomainError("Το άρθρο δεν βρέθηκε μετά την αποθήκευση.", "not_found");
    return saved;
  }

  async duplicate(id: string, context: WriteContext) {
    const source = await this.findEditable(id);
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

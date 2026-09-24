import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ArticleRepository,
  ArticleWriteInput,
  EditableArticle,
} from "@/data/articles/article-repository";
import { calculateReadingTimeMinutes, parseArticleContent } from "@/lib/article-content";
import type { AdminArticle, ArticleStatus } from "@/lib/admin-data";
import { getCategorySlug, type Article } from "@/lib/articles";

type DatabaseArticleStatus = "draft" | "in_review" | "scheduled" | "published" | "archived";

type ArticleRow = {
  id: string;
  author_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content_version: number;
  content_blocks: unknown;
  cover_image_id: string | null;
  cover_image_alt: string | null;
  status: DatabaseArticleStatus;
  is_featured: boolean;
  is_trending: boolean;
  is_fact_of_day: boolean;
  scheduled_at: string | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_time_minutes: number | null;
  created_at: string;
  updated_at: string;
};

type Relations = {
  categories: Map<string, string>;
  authors: Map<string, string>;
  images: Map<string, { src: string; width?: number; height?: number }>;
};

const statusFromDatabase: Record<DatabaseArticleStatus, ArticleStatus> = {
  draft: "Πρόχειρο",
  in_review: "Σε έλεγχο",
  scheduled: "Προγραμματισμένο",
  published: "Δημοσιευμένο",
  archived: "Αρχειοθετημένο",
};

const statusToDatabase: Record<ArticleStatus, DatabaseArticleStatus> = {
  Πρόχειρο: "draft",
  "Σε έλεγχο": "in_review",
  Προγραμματισμένο: "scheduled",
  Δημοσιευμένο: "published",
  Αρχειοθετημένο: "archived",
};

const toDateValue = (row: ArticleRow) =>
  (row.published_at ?? row.scheduled_at ?? row.updated_at ?? row.created_at).slice(0, 10);

const formatDate = (dateValue: string) =>
  new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${dateValue}T12:00:00`),
  );

export class SupabaseArticleRepository implements ArticleRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async loadRelations(): Promise<Relations> {
    const [categoryResult, profileResult, mediaResult] = await Promise.all([
      this.client.from("categories").select("id, name"),
      this.client.from("profiles").select("id, display_name"),
      this.client
        .from("media_assets")
        .select("id, storage_bucket, storage_path, visibility, width, height"),
    ]);

    const error = categoryResult.error ?? profileResult.error ?? mediaResult.error;
    if (error) throw error;

    return {
      categories: new Map(
        (categoryResult.data ?? []).map((row) => [String(row.id), String(row.name)]),
      ),
      authors: new Map(
        (profileResult.data ?? []).map((row) => [String(row.id), String(row.display_name)]),
      ),
      images: new Map(
        (mediaResult.data ?? []).map((row) => {
          if (row.visibility !== "public") return [String(row.id), { src: "" }];
          const { data } = this.client.storage
            .from(String(row.storage_bucket))
            .getPublicUrl(String(row.storage_path));
          return [
            String(row.id),
            {
              src: data.publicUrl,
              ...(typeof row.width === "number" ? { width: row.width } : {}),
              ...(typeof row.height === "number" ? { height: row.height } : {}),
            },
          ];
        }),
      ),
    };
  }

  private toPublicArticle(row: ArticleRow, relations: Relations): Article {
    const dateValue = toDateValue(row);
    return {
      slug: row.slug,
      category: row.category_id
        ? (relations.categories.get(row.category_id) ?? "Χωρίς κατηγορία")
        : "Χωρίς κατηγορία",
      title: row.title,
      excerpt: row.excerpt ?? "",
      date: formatDate(dateValue),
      minutes: row.reading_time_minutes ?? 1,
      image: row.cover_image_id ? (relations.images.get(row.cover_image_id)?.src ?? "") : "",
      popularity: row.is_trending ? 1 : 0,
      author: row.author_id
        ? (relations.authors.get(row.author_id) ?? "Συντακτική ομάδα")
        : "Συντακτική ομάδα",
    };
  }

  private toAdminArticle(row: ArticleRow, relations: Relations): AdminArticle {
    const article = this.toPublicArticle(row, relations);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt ?? "",
      category: article.category,
      author: article.author,
      status: statusFromDatabase[row.status],
      date: article.date,
      dateValue: toDateValue(row),
      views: 0,
      image: article.image,
    };
  }

  private toEditableArticle(row: ArticleRow, relations: Relations): EditableArticle {
    return {
      ...this.toAdminArticle(row, relations),
      ...(row.author_id ? { authorId: row.author_id } : {}),
      content: parseArticleContent(row.content_blocks),
      imageAlt: row.cover_image_alt ?? "",
      tags: [],
      seoTitle: row.seo_title ?? row.title,
      seoDescription: row.seo_description ?? row.excerpt ?? "",
      isFeatured: row.is_featured,
      isTrending: row.is_trending,
      isFactOfDay: row.is_fact_of_day,
    };
  }

  private async selectRows(publishedOnly: boolean) {
    let query = this.client
      .from("articles")
      .select(
        "id, author_id, category_id, title, slug, excerpt, content_version, content_blocks, cover_image_id, cover_image_alt, status, is_featured, is_trending, is_fact_of_day, scheduled_at, published_at, seo_title, seo_description, reading_time_minutes, created_at, updated_at",
      )
      .order("published_at", { ascending: false, nullsFirst: false });

    if (publishedOnly) query = query.eq("status", "published");
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ArticleRow[];
  }

  async listPublished() {
    const [rows, relations] = await Promise.all([this.selectRows(true), this.loadRelations()]);
    return rows.map((row) => this.toPublicArticle(row, relations));
  }

  async findPublishedBySlug(slug: string) {
    const { data, error } = await this.client
      .from("articles")
      .select(
        "id, author_id, category_id, title, slug, excerpt, content_version, content_blocks, cover_image_id, cover_image_alt, status, is_featured, is_trending, is_fact_of_day, scheduled_at, published_at, seo_title, seo_description, reading_time_minutes, created_at, updated_at",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const row = data as ArticleRow;
    const relations = await this.loadRelations();
    return {
      ...this.toPublicArticle(row, relations),
      content: parseArticleContent(row.content_blocks),
      mediaAssets: Object.fromEntries(relations.images),
    };
  }

  async listAdmin() {
    const [rows, relations] = await Promise.all([this.selectRows(false), this.loadRelations()]);
    return rows.map((row) => this.toAdminArticle(row, relations));
  }

  async findAdminBySlug(slug: string) {
    const { data, error } = await this.client
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.toEditableArticle(data as ArticleRow, await this.loadRelations());
  }

  async save(input: ArticleWriteInput) {
    const categorySlug = getCategorySlug(input.category);
    if (!categorySlug) {
      throw new Error(`Η κατηγορία «${input.category}» δεν έχει σταθερό database slug.`);
    }

    const { data: category, error: categoryError } = await this.client
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) {
      throw new Error(
        `Η κατηγορία «${input.category}» (${categorySlug}) λείπει από τη βάση. Εφάρμοσε πρώτα το seed migration.`,
      );
    }

    const userResult = await this.client.auth.getUser();
    if (userResult.error) throw userResult.error;

    const databaseStatus = statusToDatabase[input.status];
    const author = input.authorId ?? userResult.data.user?.id ?? null;
    const payload = {
      ...(!input.id || input.authorId ? { author_id: author } : {}),
      category_id: category.id,
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      content_version: input.content.version,
      content_blocks: input.content,
      cover_image_alt: input.imageAlt || null,
      status: databaseStatus,
      scheduled_at: databaseStatus === "scheduled" ? `${input.dateValue}T12:00:00.000Z` : null,
      seo_title: input.seoTitle || null,
      seo_description: input.seoDescription || null,
      reading_time_minutes: calculateReadingTimeMinutes(input.content),
      is_featured: input.isFeatured ?? false,
      is_trending: input.isTrending ?? false,
      is_fact_of_day: input.isFactOfDay ?? false,
    };

    const query = input.id
      ? this.client.from("articles").update(payload).eq("id", input.id)
      : this.client.from("articles").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return this.toEditableArticle(data as ArticleRow, await this.loadRelations());
  }

  async duplicate(id: string) {
    const { data: source, error: readError } = await this.client
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();
    if (readError) throw readError;

    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...copyable } = source;
    const { data, error } = await this.client
      .from("articles")
      .insert({
        ...copyable,
        slug: `${source.slug}-copy-${Date.now()}`,
        title: `${source.title} — αντίγραφο`,
        status: "draft",
        published_at: null,
        scheduled_at: null,
        is_featured: false,
        is_trending: false,
        is_fact_of_day: false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return this.toEditableArticle(data as ArticleRow, await this.loadRelations());
  }

  async delete(id: string) {
    const { error } = await this.client.from("articles").delete().eq("id", id);
    if (error) throw error;
  }
}

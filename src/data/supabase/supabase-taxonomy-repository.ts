import type { SupabaseClient } from "@supabase/supabase-js";
import { toDomainError } from "@/data/supabase/supabase-errors";
import type { TaxonomyRepository } from "@/data/taxonomy/taxonomy-repository";
import {
  sortCategories,
  toCategoryIconKey,
  type Category,
  type CategoryInput,
  type Tag,
} from "@/domain/taxonomy";
import type { ArticleStatus } from "@/domain/article-status";
import { isPubliclyVisible } from "@/domain/publishing";

type VisibilityRow = { status: ArticleStatus; scheduled_at: string | null };

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_key: string | null;
  sort_order: number;
  articles: VisibilityRow[];
};

type TagRow = {
  id: string;
  slug: string;
  name: string;
  article_tags: Array<{ article: VisibilityRow | null }>;
};

// Counts are computed from the statuses the caller may see (RLS limits
// anonymous visitors to published articles), then narrowed to the publicly visible ones.
const CATEGORY_COLUMNS =
  "id, slug, name, description, icon_key, sort_order, articles(status, scheduled_at)";
const TAG_COLUMNS = "id, slug, name, article_tags(article:articles(status, scheduled_at))";

const isVisible = (row: VisibilityRow) =>
  isPubliclyVisible({ status: row.status, scheduledAt: row.scheduled_at });

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description ?? "",
  iconKey: toCategoryIconKey(row.icon_key),
  sortOrder: row.sort_order,
  publishedCount: row.articles.filter(isVisible).length,
});

const toTag = (row: TagRow): Tag => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  publishedCount: row.article_tags.filter(({ article }) => article && isVisible(article)).length,
});

export class SupabaseTaxonomyRepository implements TaxonomyRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listCategories() {
    const { data, error } = await this.client.from("categories").select(CATEGORY_COLUMNS);
    if (error) throw error;
    return sortCategories(((data ?? []) as unknown as CategoryRow[]).map(toCategory));
  }

  async findCategoryBySlug(slug: string) {
    const { data, error } = await this.client
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toCategory(data as unknown as CategoryRow) : null;
  }

  async saveCategory(input: CategoryInput) {
    const payload = {
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      icon_key: input.iconKey,
      sort_order: input.sortOrder,
    };
    const query = input.id
      ? this.client.from("categories").update(payload).eq("id", input.id)
      : this.client.from("categories").insert(payload);
    const { data, error } = await query.select(CATEGORY_COLUMNS).single();
    if (error) throw toDomainError(error, "Υπάρχει ήδη κατηγορία με αυτό το όνομα ή slug.");
    return toCategory(data as unknown as CategoryRow);
  }

  async deleteCategory(id: string) {
    const { error } = await this.client.from("categories").delete().eq("id", id);
    if (error) throw toDomainError(error, "");
  }

  async listTags() {
    const { data, error } = await this.client.from("tags").select(TAG_COLUMNS).order("name");
    if (error) throw error;
    return ((data ?? []) as unknown as TagRow[]).map(toTag);
  }

  async findTagBySlug(slug: string) {
    const { data, error } = await this.client
      .from("tags")
      .select(TAG_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toTag(data as unknown as TagRow) : null;
  }
}

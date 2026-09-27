import type { SupabaseClient } from "@supabase/supabase-js";
import { mainLanguage } from "@/config/site";
import { toDomainError } from "@/data/supabase/supabase-errors";
import type { TaxonomyRepository } from "@/data/taxonomy/taxonomy-repository";
import type { ArticleStatus } from "@/domain/article-status";
import { DomainError } from "@/domain/errors";
import { isPubliclyVisible } from "@/domain/publishing";
import {
  localizeTaxonomy,
  slugsByLanguage,
  sortCategories,
  toCategoryIconKey,
  type Category,
  type CategoryInput,
  type Tag,
  type TagTranslationsInput,
  type TaxonomyTranslation,
} from "@/domain/taxonomy";

type VisibilityRow = { status: ArticleStatus; scheduled_at: string | null; language: string };
type TranslationRow = {
  language: string;
  name: string;
  slug: string;
  description?: string | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_key: string | null;
  sort_order: number;
  articles: VisibilityRow[];
  category_translations: TranslationRow[];
};

type TagRow = {
  id: string;
  slug: string;
  name: string;
  article_tags: Array<{ article: VisibilityRow | null }>;
  tag_translations: TranslationRow[];
};

// Counts are computed from the rows the caller may see (RLS limits anonymous
// visitors to public articles), narrowed to public ones in the requested language.
const CATEGORY_COLUMNS = [
  "id, slug, name, description, icon_key, sort_order",
  "articles(status, scheduled_at, language)",
  "category_translations(language, name, slug, description)",
].join(", ");
const TAG_COLUMNS = [
  "id, slug, name",
  "article_tags(article:articles(status, scheduled_at, language))",
  "tag_translations(language, name, slug)",
].join(", ");

const visibleIn = (language: string) => (row: VisibilityRow) =>
  row.language === language &&
  isPubliclyVisible({ status: row.status, scheduledAt: row.scheduled_at });

const toTranslations = (rows: TranslationRow[]): TaxonomyTranslation[] =>
  rows.map((row) => ({
    language: row.language,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
  }));

const toCategory = (row: CategoryRow, language: string): Category => {
  const translations = toTranslations(row.category_translations);
  const base = { slug: row.slug, name: row.name, description: row.description ?? "" };
  return {
    id: row.id,
    ...localizeTaxonomy(base, translations, language),
    iconKey: toCategoryIconKey(row.icon_key),
    sortOrder: row.sort_order,
    publishedCount: row.articles.filter(visibleIn(language)).length,
    translations,
    slugsByLanguage: slugsByLanguage(row.slug, mainLanguage, translations),
  };
};

const toTag = (row: TagRow, language: string): Tag => {
  const translations = toTranslations(row.tag_translations);
  return {
    id: row.id,
    ...localizeTaxonomy({ slug: row.slug, name: row.name }, translations, language),
    publishedCount: row.article_tags.filter(
      ({ article }) => article && visibleIn(language)(article),
    ).length,
    translations,
    slugsByLanguage: slugsByLanguage(row.slug, mainLanguage, translations),
  };
};

export class SupabaseTaxonomyRepository implements TaxonomyRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listCategories(language = mainLanguage) {
    const { data, error } = await this.client.from("categories").select(CATEGORY_COLUMNS);
    if (error) throw error;
    return sortCategories(
      ((data ?? []) as unknown as CategoryRow[]).map((row) => toCategory(row, language)),
    );
  }

  async findCategoryBySlug(slug: string, language = mainLanguage) {
    // Blogs have few categories: localizing in memory keeps one slug rule for all languages.
    return (await this.listCategories(language)).find((item) => item.slug === slug) ?? null;
  }

  /** Replaces the non-main-language rows of a category or tag. */
  private async replaceTranslations(
    table: "category_translations" | "tag_translations",
    ownerColumn: "category_id" | "tag_id",
    ownerId: string,
    translations: TaxonomyTranslation[],
  ) {
    const { error: deleteError } = await this.client.from(table).delete().eq(ownerColumn, ownerId);
    if (deleteError) throw toDomainError(deleteError, "");
    if (translations.length === 0) return;
    const rows = translations.map((translation) => ({
      [ownerColumn]: ownerId,
      language: translation.language,
      name: translation.name,
      slug: translation.slug,
      ...(table === "category_translations"
        ? { description: translation.description || null }
        : {}),
    }));
    const { error } = await this.client.from(table).insert(rows);
    if (error) throw toDomainError(error, "Υπάρχει ήδη μετάφραση με ίδιο όνομα ή slug.");
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
    const { data, error } = await query.select("id").single();
    if (error) throw toDomainError(error, "Υπάρχει ήδη κατηγορία με αυτό το όνομα ή slug.");
    const id = String(data.id);
    if (input.translations) {
      await this.replaceTranslations(
        "category_translations",
        "category_id",
        id,
        input.translations,
      );
    }
    const saved = (await this.listCategories()).find((item) => item.id === id);
    if (!saved) throw new DomainError("Η κατηγορία δεν βρέθηκε.", "not_found");
    return saved;
  }

  async deleteCategory(id: string) {
    const { error } = await this.client.from("categories").delete().eq("id", id);
    if (error) throw toDomainError(error, "");
  }

  async listTags(language = mainLanguage) {
    const { data, error } = await this.client.from("tags").select(TAG_COLUMNS);
    if (error) throw error;
    return ((data ?? []) as unknown as TagRow[])
      .map((row) => toTag(row, language))
      .sort((a, b) => a.name.localeCompare(b.name, language));
  }

  async findTagBySlug(slug: string, language = mainLanguage) {
    return (await this.listTags(language)).find((item) => item.slug === slug) ?? null;
  }

  async saveTagTranslations(input: TagTranslationsInput) {
    await this.replaceTranslations("tag_translations", "tag_id", input.tagId, input.translations);
    const saved = (await this.listTags()).find((item) => item.id === input.tagId);
    if (!saved) throw new DomainError("Η ετικέτα δεν βρέθηκε.", "not_found");
    return saved;
  }
}

import { mainLanguage } from "@/config/site";
import { scheduleOf, type MockStore } from "@/data/mock/mock-store";
import type { TaxonomyRepository } from "@/data/taxonomy/taxonomy-repository";
import { DomainError } from "@/domain/errors";
import { isPubliclyVisible } from "@/domain/publishing";
import {
  localizeTaxonomy,
  slugsByLanguage,
  sortCategories,
  type Category,
  type CategoryInput,
  type Tag,
  type TagTranslationsInput,
  type TaxonomyTranslation,
} from "@/domain/taxonomy";

const stripKey = <T extends TaxonomyTranslation>({
  language,
  name,
  slug,
  description,
}: T): TaxonomyTranslation => ({ language, name, slug, description });

/** In-memory categories and tags with per-language names, like the database. */
export class MockTaxonomyRepository implements TaxonomyRepository {
  constructor(private readonly store: MockStore) {}

  private publishedArticles(language: string) {
    return this.store.articles.filter(
      (row) => row.language === language && isPubliclyVisible(scheduleOf(row)),
    );
  }

  private categoryTranslations(id: string) {
    return this.store.categoryTranslations.filter((item) => item.categoryId === id).map(stripKey);
  }

  private tagTranslations(id: string) {
    return this.store.tagTranslations.filter((item) => item.tagId === id).map(stripKey);
  }

  private toCategory(row: MockStore["categories"][number], language: string): Category {
    const translations = this.categoryTranslations(row.id);
    return {
      ...localizeTaxonomy(row, translations, language),
      translations,
      slugsByLanguage: slugsByLanguage(row.slug, mainLanguage, translations),
      publishedCount: this.publishedArticles(language).filter(
        (article) => article.categoryId === row.id,
      ).length,
    };
  }

  private toTag(row: MockStore["tags"][number], language: string): Tag {
    const translations = this.tagTranslations(row.id);
    return {
      ...localizeTaxonomy(row, translations, language),
      translations,
      slugsByLanguage: slugsByLanguage(row.slug, mainLanguage, translations),
      publishedCount: this.publishedArticles(language).filter((article) =>
        article.tagIds.includes(row.id),
      ).length,
    };
  }

  /** Mirrors `unique (language, slug)` and `unique (language, lower(name))`. */
  private assertTranslationsUnique(
    existing: ReadonlyArray<TaxonomyTranslation & { ownerId: string }>,
    ownerId: string,
    translations: readonly TaxonomyTranslation[],
  ) {
    for (const translation of translations) {
      const clash = existing.find(
        (item) =>
          item.ownerId !== ownerId &&
          item.language === translation.language &&
          (item.slug === translation.slug ||
            item.name.toLocaleLowerCase() === translation.name.toLocaleLowerCase()),
      );
      if (clash) {
        throw new DomainError(
          `Υπάρχει ήδη «${clash.name}» (${translation.language}) με ίδιο όνομα ή slug.`,
          "conflict",
        );
      }
    }
  }

  async listCategories(language = mainLanguage) {
    return sortCategories(this.store.categories.map((row) => this.toCategory(row, language)));
  }

  async findCategoryBySlug(slug: string, language = mainLanguage) {
    const category = (await this.listCategories(language)).find((item) => item.slug === slug);
    return category ?? null;
  }

  async saveCategory(input: CategoryInput) {
    const existing = input.id
      ? this.store.categories.find((item) => item.id === input.id)
      : undefined;
    if (input.id && !existing) throw new DomainError("Η κατηγορία δεν βρέθηκε.", "not_found");

    const others = this.store.categories.filter((item) => item.id !== input.id);
    if (others.some((item) => item.slug === input.slug)) {
      throw new DomainError("Υπάρχει ήδη κατηγορία με αυτό το slug.", "conflict");
    }
    if (
      others.some(
        (item) => item.name.toLocaleLowerCase("el") === input.name.toLocaleLowerCase("el"),
      )
    ) {
      throw new DomainError("Υπάρχει ήδη κατηγορία με αυτό το όνομα.", "conflict");
    }

    const { translations, ...fields } = input;
    const row = { ...fields, id: existing?.id ?? crypto.randomUUID() };
    if (translations) {
      this.assertTranslationsUnique(
        this.store.categoryTranslations.map((item) => ({ ...item, ownerId: item.categoryId })),
        row.id,
        translations,
      );
    }
    this.store.categories = existing
      ? this.store.categories.map((item) => (item.id === row.id ? row : item))
      : [...this.store.categories, row];
    if (translations) {
      this.store.categoryTranslations = [
        ...this.store.categoryTranslations.filter((item) => item.categoryId !== row.id),
        ...translations.map((translation) => ({ ...translation, categoryId: row.id })),
      ];
    }
    return this.toCategory(row, mainLanguage);
  }

  async deleteCategory(id: string) {
    // Mirrors `on delete set null` (articles) and `on delete cascade` (translations).
    for (const article of this.store.articles) {
      if (article.categoryId === id) article.categoryId = null;
    }
    this.store.categories = this.store.categories.filter((item) => item.id !== id);
    this.store.categoryTranslations = this.store.categoryTranslations.filter(
      (item) => item.categoryId !== id,
    );
  }

  async listTags(language = mainLanguage) {
    return this.store.tags
      .map((row) => this.toTag(row, language))
      .sort((a, b) => a.name.localeCompare(b.name, language));
  }

  async findTagBySlug(slug: string, language = mainLanguage) {
    const tag = (await this.listTags(language)).find((item) => item.slug === slug);
    return tag ?? null;
  }

  async saveTagTranslations(input: TagTranslationsInput) {
    const row = this.store.tags.find((item) => item.id === input.tagId);
    if (!row) throw new DomainError("Η ετικέτα δεν βρέθηκε.", "not_found");
    this.assertTranslationsUnique(
      this.store.tagTranslations.map((item) => ({ ...item, ownerId: item.tagId })),
      row.id,
      input.translations,
    );
    this.store.tagTranslations = [
      ...this.store.tagTranslations.filter((item) => item.tagId !== row.id),
      ...input.translations.map((translation) => ({ ...translation, tagId: row.id })),
    ];
    return this.toTag(row, mainLanguage);
  }
}

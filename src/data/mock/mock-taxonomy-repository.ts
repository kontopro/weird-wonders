import type { MockStore } from "@/data/mock/mock-store";
import type { TaxonomyRepository } from "@/data/taxonomy/taxonomy-repository";
import { DomainError } from "@/domain/errors";
import { sortCategories, type Category, type CategoryInput, type Tag } from "@/domain/taxonomy";

export class MockTaxonomyRepository implements TaxonomyRepository {
  constructor(private readonly store: MockStore) {}

  private publishedArticles() {
    return this.store.articles.filter((row) => row.status === "Δημοσιευμένο");
  }

  private toCategory(row: MockStore["categories"][number]): Category {
    return {
      ...row,
      publishedCount: this.publishedArticles().filter((article) => article.categoryId === row.id)
        .length,
    };
  }

  private toTag(row: MockStore["tags"][number]): Tag {
    return {
      ...row,
      publishedCount: this.publishedArticles().filter((article) => article.tagIds.includes(row.id))
        .length,
    };
  }

  async listCategories() {
    return sortCategories(this.store.categories.map((row) => this.toCategory(row)));
  }

  async findCategoryBySlug(slug: string) {
    const row = this.store.categories.find((item) => item.slug === slug);
    return row ? this.toCategory(row) : null;
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

    const row = { ...input, id: existing?.id ?? crypto.randomUUID() };
    this.store.categories = existing
      ? this.store.categories.map((item) => (item.id === row.id ? row : item))
      : [...this.store.categories, row];
    return this.toCategory(row);
  }

  async deleteCategory(id: string) {
    // Mirrors `on delete set null`: articles stay, without a category.
    for (const article of this.store.articles) {
      if (article.categoryId === id) article.categoryId = null;
    }
    this.store.categories = this.store.categories.filter((item) => item.id !== id);
  }

  async listTags() {
    return this.store.tags
      .map((row) => this.toTag(row))
      .sort((a, b) => a.name.localeCompare(b.name, "el"));
  }

  async findTagBySlug(slug: string) {
    const row = this.store.tags.find((item) => item.slug === slug);
    return row ? this.toTag(row) : null;
  }
}

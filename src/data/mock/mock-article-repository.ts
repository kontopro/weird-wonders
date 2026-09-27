import {
  assertArticleWriteInvariants,
  type ArticleRepository,
  type ArticleWriteInput,
  type EditableArticle,
  type PublishedArticleFilter,
  type WriteContext,
} from "@/data/articles/article-repository";
import { scheduleOf, type MockArticleRow, type MockStore } from "@/data/mock/mock-store";
import { editorialTeam, type AuthorRef } from "@/domain/authors";
import { DomainError } from "@/domain/errors";
import { effectiveStatus, isPubliclyVisible } from "@/domain/publishing";
import { authorEditableStatuses, canEditArticle, isEditorRole } from "@/domain/permissions";
import { uncategorized, type CategoryRef, type TagRef } from "@/domain/taxonomy";
import type { AdminArticle } from "@/lib/admin-data";
import { calculateReadingTimeMinutes } from "@/lib/article-content";
import type { Article } from "@/lib/articles";
import { formatArticleDate } from "@/lib/format";
import { slugify } from "@/lib/slug";

const byNewest = (a: MockArticleRow, b: MockArticleRow) => b.dateValue.localeCompare(a.dateValue);

export class MockArticleRepository implements ArticleRepository {
  constructor(private readonly store: MockStore) {}

  private categoryRef(id: string | null): CategoryRef {
    const category = id ? this.store.categories.find((item) => item.id === id) : undefined;
    return category
      ? { slug: category.slug, name: category.name, iconKey: category.iconKey }
      : uncategorized;
  }

  private authorRef(id: string | null): AuthorRef {
    const profile = id ? this.store.profiles.find((item) => item.id === id) : undefined;
    return profile ? { slug: profile.slug, name: profile.displayName } : editorialTeam;
  }

  private tagRefs(ids: string[]): TagRef[] {
    return ids.flatMap((id) => {
      const tag = this.store.tags.find((item) => item.id === id);
      return tag ? [{ slug: tag.slug, name: tag.name }] : [];
    });
  }

  private toPublic(row: MockArticleRow): Article {
    return {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      date: formatArticleDate(row.dateValue),
      minutes: row.minutes ?? calculateReadingTimeMinutes(row.content),
      image: row.image,
      popularity: row.popularity,
      category: this.categoryRef(row.categoryId),
      author: this.authorRef(row.authorId),
      tags: this.tagRefs(row.tagIds),
    };
  }

  private toAdmin(row: MockArticleRow): AdminArticle {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      category: this.categoryRef(row.categoryId),
      author: this.authorRef(row.authorId),
      status: effectiveStatus(scheduleOf(row)),
      date: formatArticleDate(row.dateValue),
      dateValue: row.dateValue,
      views: row.views,
      image: row.image,
    };
  }

  private toEditable(row: MockArticleRow): EditableArticle {
    return {
      ...this.toAdmin(row),
      authorId: row.authorId,
      content: structuredClone(row.content),
      imageAlt: row.imageAlt,
      tags: this.tagRefs(row.tagIds),
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      isFeatured: row.isFeatured,
      isTrending: row.isTrending,
      isFactOfDay: row.isFactOfDay,
    };
  }

  private published() {
    return this.store.articles.filter((row) => isPubliclyVisible(scheduleOf(row)));
  }

  async listPublished(filter: PublishedArticleFilter = {}) {
    const { categorySlug, tagSlug, authorSlug } = filter;
    const categoryId = categorySlug
      ? this.store.categories.find((item) => item.slug === categorySlug)?.id
      : undefined;
    const tagId = tagSlug ? this.store.tags.find((item) => item.slug === tagSlug)?.id : undefined;
    const authorId = authorSlug
      ? this.store.profiles.find((item) => item.slug === authorSlug)?.id
      : undefined;
    if ((categorySlug && !categoryId) || (tagSlug && !tagId) || (authorSlug && !authorId)) {
      return [];
    }

    return this.published()
      .filter(
        (row) =>
          (!categoryId || row.categoryId === categoryId) &&
          (!tagId || row.tagIds.includes(tagId)) &&
          (!authorId || row.authorId === authorId),
      )
      .sort(byNewest)
      .map((row) => this.toPublic(row));
  }

  async findPublishedBySlug(slug: string) {
    const row = this.published().find((item) => item.slug === slug);
    if (!row) return null;
    return { ...this.toPublic(row), content: structuredClone(row.content), mediaAssets: {} };
  }

  async listAdmin() {
    return [...this.store.articles].sort(byNewest).map((row) => this.toAdmin(row));
  }

  async findAdminBySlug(slug: string) {
    const row = this.store.articles.find((item) => item.slug === slug);
    return row ? this.toEditable(row) : null;
  }

  /** Resolves tag names to ids, creating missing tags when the actor may. */
  private resolveTagIds(names: string[], context: WriteContext): string[] {
    const ids = new Set<string>();
    for (const name of names) {
      const slug = slugify(name);
      if (!slug) continue;
      let tag = this.store.tags.find((item) => item.slug === slug);
      if (!tag) {
        if (!isEditorRole(context.actorRole)) {
          throw new DomainError(
            `Η ετικέτα «${name}» δεν υπάρχει. Μόνο οι επιμελητές δημιουργούν νέες ετικέτες.`,
            "forbidden",
          );
        }
        tag = { id: crypto.randomUUID(), slug, name: name.trim() };
        this.store.tags.push(tag);
      }
      ids.add(tag.id);
    }
    return [...ids];
  }

  async save(input: ArticleWriteInput, context: WriteContext) {
    assertArticleWriteInvariants(input);
    const existing = input.id
      ? this.store.articles.find((item) => item.id === input.id)
      : undefined;
    if (input.id && !existing) throw new DomainError("Το άρθρο δεν βρέθηκε.", "not_found");

    const actor = { id: context.actorId, role: context.actorRole };
    if (existing && !canEditArticle(actor, existing)) {
      throw new DomainError("Δεν μπορείς να επεξεργαστείς αυτό το άρθρο.", "forbidden");
    }
    const isEditor = isEditorRole(context.actorRole);
    if (
      !isEditor &&
      (!authorEditableStatuses.includes(input.status) ||
        input.isFeatured ||
        input.isTrending ||
        input.isFactOfDay)
    ) {
      throw new DomainError(
        "Οι συντάκτες αποθηκεύουν πρόχειρα ή τα στέλνουν για έλεγχο· τη δημοσίευση την κάνει επιμελητής.",
        "forbidden",
      );
    }

    const category = this.store.categories.find((item) => item.slug === input.categorySlug);
    if (!category) throw new DomainError("Η κατηγορία δεν υπάρχει.", "invalid");

    if (this.store.articles.some((item) => item.slug === input.slug && item.id !== input.id)) {
      throw new DomainError("Υπάρχει ήδη άρθρο με αυτό το slug.", "conflict");
    }

    const tagIds = input.tags ? this.resolveTagIds(input.tags, context) : (existing?.tagIds ?? []);

    const next: MockArticleRow = {
      id: existing?.id ?? crypto.randomUUID(),
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      categoryId: category.id,
      authorId: existing ? existing.authorId : context.actorId,
      tagIds,
      status: input.status,
      dateValue: input.dateValue,
      image: input.image ?? existing?.image ?? "",
      imageAlt: input.imageAlt ?? existing?.imageAlt ?? "",
      content: structuredClone(input.content),
      seoTitle: input.seoTitle ?? existing?.seoTitle ?? "",
      seoDescription: input.seoDescription ?? existing?.seoDescription ?? "",
      isFeatured: input.isFeatured ?? existing?.isFeatured ?? false,
      isTrending: input.isTrending ?? existing?.isTrending ?? false,
      isFactOfDay: input.isFactOfDay ?? existing?.isFactOfDay ?? false,
      views: existing?.views ?? 0,
      popularity: existing?.popularity ?? 0,
    };

    // Mirrors the database's single "fact of the day" constraint.
    if (next.isFactOfDay) {
      for (const item of this.store.articles) item.isFactOfDay = false;
    }

    if (existing) {
      this.store.articles = this.store.articles.map((item) =>
        item.id === existing.id ? next : item,
      );
    } else {
      this.store.articles.unshift(next);
    }
    return this.toEditable(next);
  }

  async duplicate(id: string, context: WriteContext) {
    const source = this.store.articles.find((item) => item.id === id);
    if (!source) throw new DomainError("Το άρθρο δεν βρέθηκε.", "not_found");

    const copy: MockArticleRow = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      slug: `${source.slug}-copy-${Date.now()}`,
      title: `${source.title} — αντίγραφο`,
      authorId: context.actorId,
      status: "draft",
      views: 0,
      isFeatured: false,
      isTrending: false,
      isFactOfDay: false,
    };
    this.store.articles.unshift(copy);
    return this.toEditable(copy);
  }

  async delete(id: string) {
    this.store.articles = this.store.articles.filter((item) => item.id !== id);
  }
}

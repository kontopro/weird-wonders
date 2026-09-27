import { mainLanguage, siteConfig } from "@/config/site";
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
import { collectAssetIds } from "@/domain/media";
import { matchesSearch, pageOf, popularWindowDays, searchTerms } from "@/domain/listing";
import { MockMediaRepository } from "@/data/mock/mock-media-repository";
import { effectiveStatus, isPubliclyVisible } from "@/domain/publishing";
import { authorEditableStatuses, canEditArticle, isEditorRole } from "@/domain/permissions";
import {
  findMatchingTag,
  newTagForbiddenMessage,
  uncategorized,
  localizeTaxonomy,
  type CategoryRef,
  type TagRef,
} from "@/domain/taxonomy";
import type { AdminArticle } from "@/lib/admin-data";
import { calculateReadingTimeMinutes, documentText } from "@/lib/article-content";
import type { Article } from "@/lib/articles";
import { formatArticleDate } from "@/lib/format";
import { slugify } from "@/lib/slug";

const byNewest = (a: MockArticleRow, b: MockArticleRow) => b.dateValue.localeCompare(a.dateValue);

export class MockArticleRepository implements ArticleRepository {
  constructor(private readonly store: MockStore) {}

  /** Category name and slug in the article's language (falling back to the main one). */
  private categoryRef(id: string | null, language: string): CategoryRef {
    const category = id ? this.store.categories.find((item) => item.id === id) : undefined;
    if (!category) return uncategorized;
    const translations = this.store.categoryTranslations.filter((item) => item.categoryId === id);
    const { slug, name } = localizeTaxonomy(category, translations, language);
    return { slug, name, iconKey: category.iconKey };
  }

  private authorRef(id: string | null): AuthorRef {
    const profile = id ? this.store.profiles.find((item) => item.id === id) : undefined;
    return profile ? { slug: profile.slug, name: profile.displayName } : editorialTeam;
  }

  private tagRefs(ids: string[], language: string): TagRef[] {
    return ids.flatMap((id) => {
      const tag = this.store.tags.find((item) => item.id === id);
      if (!tag) return [];
      const translations = this.store.tagTranslations.filter((item) => item.tagId === id);
      const { slug, name } = localizeTaxonomy(tag, translations, language);
      return [{ slug, name }];
    });
  }

  /** Other versions of the same piece (every status). */
  private versionsOf(row: MockArticleRow) {
    return this.store.articles.filter(
      (item) => item.translationGroupId === row.translationGroupId && item.id !== row.id,
    );
  }

  private coverSrc(assetId: string | null) {
    return (assetId && this.store.media.find((item) => item.id === assetId)?.src) || "";
  }

  /** Views in the last `popularWindowDays` days (like `article_view_counts`). */
  private recentViews(id: string) {
    const since = new Date(Date.now() - popularWindowDays * 86_400_000).toISOString().slice(0, 10);
    return this.store.articleViews
      .filter((entry) => entry.articleId === id && entry.day > since)
      .reduce((total, entry) => total + entry.views, 0);
  }

  private toPublic(row: MockArticleRow): Article {
    return {
      id: row.id,
      slug: row.slug,
      language: row.language,
      title: row.title,
      excerpt: row.excerpt,
      date: formatArticleDate(row.dateValue),
      dateValue: row.dateValue,
      minutes: row.minutes ?? calculateReadingTimeMinutes(row.content),
      image: this.coverSrc(row.coverAssetId),
      imageAlt: row.imageAlt,
      popularity: this.recentViews(row.id),
      category: this.categoryRef(row.categoryId, row.language),
      author: this.authorRef(row.authorId),
      tags: this.tagRefs(row.tagIds, row.language),
      isFeatured: row.isFeatured,
      isHighlighted: row.isHighlighted,
    };
  }

  // The admin always works with main-language category and tag names (the
  // editor saves tags by name); public pages show the article's language.
  private toAdmin(row: MockArticleRow): AdminArticle {
    return {
      id: row.id,
      slug: row.slug,
      language: row.language,
      title: row.title,
      excerpt: row.excerpt,
      category: this.categoryRef(row.categoryId, mainLanguage),
      author: this.authorRef(row.authorId),
      status: effectiveStatus(scheduleOf(row)),
      date: formatArticleDate(row.dateValue),
      dateValue: row.dateValue,
      views: row.views,
      image: this.coverSrc(row.coverAssetId),
    };
  }

  private toEditable(row: MockArticleRow): EditableArticle {
    return {
      ...this.toAdmin(row),
      authorId: row.authorId,
      coverAssetId: row.coverAssetId,
      language: row.language,
      translationGroupId: row.translationGroupId,
      translations: this.versionsOf(row).map((item) => ({
        id: item.id,
        language: item.language,
        slug: item.slug,
        title: item.title,
        status: effectiveStatus(scheduleOf(item)),
      })),
      content: structuredClone(row.content),
      imageAlt: row.imageAlt,
      tags: this.tagRefs(row.tagIds, mainLanguage),
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      isFeatured: row.isFeatured,
      isTrending: row.isTrending,
      isHighlighted: row.isHighlighted,
    };
  }

  private published(language: string = mainLanguage) {
    return this.store.articles.filter(
      (row) => row.language === language && isPubliclyVisible(scheduleOf(row)),
    );
  }

  private minutesOf(row: MockArticleRow) {
    return row.minutes ?? calculateReadingTimeMinutes(row.content);
  }

  private filterRows(filter: PublishedArticleFilter): MockArticleRow[] {
    const {
      categorySlug,
      tagSlug,
      authorSlug,
      minMinutes,
      maxMinutes,
      language = mainLanguage,
    } = filter;
    // Category and tag slugs are matched in the requested language.
    const categoryId = categorySlug
      ? this.store.categories.find(
          (item) => this.categoryRef(item.id, language).slug === categorySlug,
        )?.id
      : undefined;
    const tagId = tagSlug
      ? this.store.tags.find((item) => this.tagRefs([item.id], language)[0]?.slug === tagSlug)?.id
      : undefined;
    const authorId = authorSlug
      ? this.store.profiles.find((item) => item.slug === authorSlug)?.id
      : undefined;
    if ((categorySlug && !categoryId) || (tagSlug && !tagId) || (authorSlug && !authorId)) {
      return [];
    }

    return this.published(language)
      .filter(
        (row) =>
          (!categoryId || row.categoryId === categoryId) &&
          (!tagId || row.tagIds.includes(tagId)) &&
          (!authorId || row.authorId === authorId) &&
          (minMinutes === undefined || this.minutesOf(row) >= minMinutes) &&
          (maxMinutes === undefined || this.minutesOf(row) <= maxMinutes),
      )
      .sort(byNewest);
  }

  async listPublished(filter: PublishedArticleFilter & { limit?: number } = {}) {
    const rows = this.filterRows(filter);
    return (filter.limit ? rows.slice(0, filter.limit) : rows).map((row) => this.toPublic(row));
  }

  async pagePublished(filter: PublishedArticleFilter, page: number, pageSize?: number) {
    const result = pageOf(this.filterRows(filter), page, pageSize);
    return { ...result, items: result.items.map((row) => this.toPublic(row)) };
  }

  async search(query: string, filter: PublishedArticleFilter, page: number, pageSize?: number) {
    const terms = searchTerms(query);
    const matches = this.filterRows(filter).filter((row) =>
      matchesSearch(`${row.title} ${row.excerpt} ${documentText(row.content)}`, terms),
    );
    const result = pageOf(matches, page, pageSize);
    return { ...result, items: result.items.map((row) => this.toPublic(row)) };
  }

  async listPopular(language: string | undefined, limit: number) {
    return this.published(language ?? mainLanguage)
      .map((row) => ({ row, views: this.recentViews(row.id) }))
      .sort((a, b) => b.views - a.views || byNewest(a.row, b.row))
      .slice(0, limit)
      .map(({ row }) => this.toPublic(row));
  }

  async resolveOldSlug(slug: string, language = mainLanguage) {
    const entry = this.store.slugHistory.find(
      (item) => item.language === language && item.slug === slug,
    );
    const row = entry && this.published(language).find((item) => item.id === entry.articleId);
    return row?.slug ?? null;
  }

  async recordView(articleId: string) {
    const row = this.store.articles.find((item) => item.id === articleId);
    if (!row || !isPubliclyVisible(scheduleOf(row))) return;
    const day = new Date().toISOString().slice(0, 10);
    const entry = this.store.articleViews.find(
      (item) => item.articleId === articleId && item.day === day,
    );
    if (entry) entry.views += 1;
    else this.store.articleViews.push({ articleId, day, views: 1 });
    row.views += 1;
  }

  async findPublishedBySlug(slug: string, language = mainLanguage) {
    const row = this.published(language).find((item) => item.slug === slug);
    if (!row) return null;
    const mediaAssets = await new MockMediaRepository(this.store).resolve([
      ...collectAssetIds(row.content),
    ]);
    const translations = this.versionsOf(row)
      .filter((item) => isPubliclyVisible(scheduleOf(item)))
      .map((item) => ({ language: item.language, slug: item.slug }));
    return {
      ...this.toPublic(row),
      content: structuredClone(row.content),
      mediaAssets,
      translations,
    };
  }

  async listAdmin() {
    return [...this.store.articles].sort(byNewest).map((row) => this.toAdmin(row));
  }

  async findAdminById(id: string) {
    const row = this.store.articles.find((item) => item.id === id);
    return row ? this.toEditable(row) : null;
  }

  async createTranslation(sourceId: string, language: string, context: WriteContext) {
    const source = this.store.articles.find((item) => item.id === sourceId);
    if (!source) throw new DomainError("Το άρθρο δεν βρέθηκε.", "not_found");
    if (!siteConfig.languages.includes(language) || language === source.language) {
      throw new DomainError("Μη έγκυρη γλώσσα μετάφρασης.", "invalid");
    }
    if (this.versionsOf(source).some((item) => item.language === language)) {
      throw new DomainError("Υπάρχει ήδη εκδοχή του άρθρου σε αυτή τη γλώσσα.", "conflict");
    }
    // Keep the slug when it is free in that language (slugs are unique per language).
    let slug = source.slug;
    for (
      let n = 2;
      this.store.articles.some((item) => item.language === language && item.slug === slug);
      n++
    ) {
      slug = `${source.slug}-${n}`;
    }
    const copy: MockArticleRow = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      slug,
      language,
      authorId: context.actorId,
      status: "draft",
      views: 0,
      popularity: 0,
      isFeatured: false,
      isTrending: false,
      isHighlighted: false,
    };
    this.store.articles.unshift(copy);
    return this.toEditable(copy);
  }

  /** Resolves tag names to ids, creating missing tags when the actor may. */
  private resolveTagIds(names: string[], context: WriteContext): string[] {
    const ids = new Set<string>();
    for (const name of names) {
      const slug = slugify(name);
      if (!slug) continue;
      let tag = findMatchingTag(this.store.tags, { slug, name });
      if (!tag) {
        if (!isEditorRole(context.actorRole)) {
          throw new DomainError(`«${name.trim()}»: ${newTagForbiddenMessage}`, "forbidden");
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
        input.isHighlighted)
    ) {
      throw new DomainError(
        "Οι συντάκτες αποθηκεύουν πρόχειρα ή τα στέλνουν για έλεγχο· τη δημοσίευση την κάνει επιμελητής.",
        "forbidden",
      );
    }

    const category = this.store.categories.find((item) => item.slug === input.categorySlug);
    if (!category) throw new DomainError("Η κατηγορία δεν υπάρχει.", "invalid");

    // Mirrors the database: unique (language, slug) and one version per language per group.
    const language = input.language ?? existing?.language ?? mainLanguage;
    const translationGroupId =
      existing?.translationGroupId ?? input.translationGroupId ?? crypto.randomUUID();
    const others = this.store.articles.filter((item) => item.id !== input.id);
    if (others.some((item) => item.language === language && item.slug === input.slug)) {
      throw new DomainError("Υπάρχει ήδη άρθρο με αυτό το slug.", "conflict");
    }
    if (
      others.some(
        (item) => item.translationGroupId === translationGroupId && item.language === language,
      )
    ) {
      throw new DomainError("Υπάρχει ήδη εκδοχή του άρθρου σε αυτή τη γλώσσα.", "conflict");
    }

    if (input.coverAssetId && !this.store.media.some((item) => item.id === input.coverAssetId)) {
      throw new DomainError("Η εικόνα εξωφύλλου δεν βρέθηκε.", "invalid");
    }

    const tagIds = input.tags ? this.resolveTagIds(input.tags, context) : (existing?.tagIds ?? []);

    // Mirrors `article_slug_history`: a public article's old slug keeps redirecting.
    this.store.slugHistory = this.store.slugHistory.filter(
      (item) => !(item.language === language && item.slug === input.slug),
    );
    if (
      existing &&
      existing.slug !== input.slug &&
      (isPubliclyVisible(scheduleOf(existing)) || existing.status === "archived")
    ) {
      this.store.slugHistory.push({
        language: existing.language,
        slug: existing.slug,
        articleId: existing.id,
      });
    }

    const next: MockArticleRow = {
      id: existing?.id ?? crypto.randomUUID(),
      slug: input.slug,
      language,
      translationGroupId,
      title: input.title,
      excerpt: input.excerpt,
      categoryId: category.id,
      authorId: existing ? existing.authorId : context.actorId,
      tagIds,
      status: input.status,
      dateValue: input.dateValue,
      coverAssetId:
        input.coverAssetId === undefined ? (existing?.coverAssetId ?? null) : input.coverAssetId,
      imageAlt: input.imageAlt ?? existing?.imageAlt ?? "",
      content: structuredClone(input.content),
      seoTitle: input.seoTitle ?? existing?.seoTitle ?? "",
      seoDescription: input.seoDescription ?? existing?.seoDescription ?? "",
      isFeatured: input.isFeatured ?? existing?.isFeatured ?? false,
      isTrending: input.isTrending ?? existing?.isTrending ?? false,
      isHighlighted: input.isHighlighted ?? existing?.isHighlighted ?? false,
      views: existing?.views ?? 0,
      popularity: existing?.popularity ?? 0,
    };

    // Mirrors the database: highlighting an article moves the highlight.
    if (next.isHighlighted) {
      for (const item of this.store.articles) item.isHighlighted = false;
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
      // A copy is a new piece, not a translation.
      translationGroupId: crypto.randomUUID(),
      slug: `${source.slug}-copy-${Date.now()}`,
      title: `${source.title} — αντίγραφο`,
      authorId: context.actorId,
      status: "draft",
      views: 0,
      isFeatured: false,
      isTrending: false,
      isHighlighted: false,
    };
    this.store.articles.unshift(copy);
    return this.toEditable(copy);
  }

  async delete(id: string) {
    this.store.articles = this.store.articles.filter((item) => item.id !== id);
  }
}

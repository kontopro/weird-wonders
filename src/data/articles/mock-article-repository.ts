import {
  assertArticleWriteInvariants,
  type ArticleRepository,
  type ArticleWriteInput,
  type EditableArticle,
} from "@/data/articles/article-repository";
import { demoAdminArticles, type AdminArticle } from "@/lib/admin-data";
import { calculateReadingTimeMinutes } from "@/lib/article-content";
import { demoArticleContent, demoArticles, type Article } from "@/lib/articles";

const clonePublicArticle = (article: Article): Article => ({ ...article });
const cloneAdminArticle = (article: AdminArticle): AdminArticle => ({ ...article });
const cloneEditableArticle = (article: EditableArticle): EditableArticle => ({
  ...article,
  content: structuredClone(article.content),
  tags: [...article.tags],
});

const initialRows: EditableArticle[] = demoAdminArticles.map((article) => {
  const publicArticle = demoArticles.find((candidate) => candidate.slug === article.slug);
  return {
    ...article,
    content: structuredClone(demoArticleContent),
    imageAlt: "",
    tags: [],
    seoTitle: article.title,
    seoDescription: article.excerpt,
    isFeatured: article.id === "1",
    isTrending: (publicArticle?.popularity ?? 0) > 80,
    isFactOfDay: false,
  };
});

export class MockArticleRepository implements ArticleRepository {
  private adminRows = initialRows.map(cloneEditableArticle);

  async listPublished() {
    return this.adminRows
      .filter((article) => article.status === "Δημοσιευμένο")
      .map((article) => {
        const original = demoArticles.find((candidate) => candidate.slug === article.slug);
        return {
          slug: article.slug,
          category: article.category,
          title: article.title,
          excerpt: article.excerpt,
          date: article.date,
          minutes: original?.minutes ?? calculateReadingTimeMinutes(article.content),
          image: article.image,
          popularity: original?.popularity ?? article.views,
          author: article.author,
        };
      })
      .map(clonePublicArticle);
  }

  async findPublishedBySlug(slug: string) {
    const article = this.adminRows.find(
      (item) => item.slug === slug && item.status === "Δημοσιευμένο",
    );
    if (!article) return null;
    const matching = (await this.listPublished()).find((item) => item.slug === slug);
    if (!matching) return null;
    return {
      ...clonePublicArticle(matching),
      content: structuredClone(article.content),
      mediaAssets: {},
    };
  }

  async listAdmin() {
    return this.adminRows.map(cloneAdminArticle);
  }

  async findAdminBySlug(slug: string) {
    const article = this.adminRows.find((item) => item.slug === slug);
    return article ? cloneEditableArticle(article) : null;
  }

  async save(input: ArticleWriteInput) {
    assertArticleWriteInvariants(input);
    const existing = input.id ? this.adminRows.find((item) => item.id === input.id) : undefined;
    const next: EditableArticle = {
      id: existing?.id ?? crypto.randomUUID(),
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      category: input.category,
      author: existing?.author ?? "Μαρία Παπαδοπούλου",
      status: input.status,
      date: new Intl.DateTimeFormat("el-GR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(`${input.dateValue}T12:00:00`)),
      dateValue: input.dateValue,
      views: existing?.views ?? 0,
      image: input.image ?? existing?.image ?? "",
      ...(input.authorId
        ? { authorId: input.authorId }
        : existing?.authorId
          ? { authorId: existing.authorId }
          : {}),
      content: structuredClone(input.content),
      imageAlt: input.imageAlt ?? existing?.imageAlt ?? "",
      tags: [...(input.tags ?? existing?.tags ?? [])],
      seoTitle: input.seoTitle ?? existing?.seoTitle ?? input.title,
      seoDescription: input.seoDescription ?? existing?.seoDescription ?? input.excerpt,
      isFeatured: input.isFeatured ?? existing?.isFeatured ?? false,
      isTrending: input.isTrending ?? existing?.isTrending ?? false,
      isFactOfDay: input.isFactOfDay ?? existing?.isFactOfDay ?? false,
    };

    this.adminRows = existing
      ? this.adminRows.map((item) => (item.id === existing.id ? next : item))
      : [next, ...this.adminRows];

    return cloneEditableArticle(next);
  }

  async duplicate(id: string) {
    const source = this.adminRows.find((item) => item.id === id);
    if (!source) throw new Error("Article not found");

    const copy: EditableArticle = {
      ...cloneEditableArticle(source),
      id: crypto.randomUUID(),
      slug: `${source.slug}-copy-${Date.now()}`,
      title: `${source.title} — αντίγραφο`,
      status: "Πρόχειρο",
      views: 0,
    };
    this.adminRows = [copy, ...this.adminRows];
    return cloneEditableArticle(copy);
  }

  async delete(id: string) {
    this.adminRows = this.adminRows.filter((item) => item.id !== id);
  }
}

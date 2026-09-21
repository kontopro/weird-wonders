import type { ArticleRepository, ArticleWriteInput } from "@/data/articles/article-repository";
import { demoAdminArticles, type AdminArticle } from "@/lib/admin-data";
import { demoArticleContent, demoArticles, type Article } from "@/lib/articles";

const clonePublicArticle = (article: Article): Article => ({ ...article });
const cloneAdminArticle = (article: AdminArticle): AdminArticle => ({ ...article });

export class MockArticleRepository implements ArticleRepository {
  private adminRows = demoAdminArticles.map(cloneAdminArticle);

  async listPublished() {
    return demoArticles.map(clonePublicArticle);
  }

  async findPublishedBySlug(slug: string) {
    const article = demoArticles.find((item) => item.slug === slug);
    return article ? { ...clonePublicArticle(article), content: demoArticleContent } : null;
  }

  async listAdmin() {
    return this.adminRows.map(cloneAdminArticle);
  }

  async findAdminBySlug(slug: string) {
    const article = this.adminRows.find((item) => item.slug === slug);
    return article ? cloneAdminArticle(article) : null;
  }

  async save(input: ArticleWriteInput) {
    const existing = input.id ? this.adminRows.find((item) => item.id === input.id) : undefined;
    const next: AdminArticle = {
      id: existing?.id ?? crypto.randomUUID(),
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      category: input.category,
      author: existing?.author ?? "Μαρία Παπαδοπούλου",
      status: input.status,
      date: new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(`${input.dateValue}T12:00:00`),
      ),
      dateValue: input.dateValue,
      views: existing?.views ?? 0,
      image: input.image ?? existing?.image ?? "",
    };

    this.adminRows = existing
      ? this.adminRows.map((item) => (item.id === existing.id ? next : item))
      : [next, ...this.adminRows];

    return cloneAdminArticle(next);
  }

  async duplicate(id: string) {
    const source = this.adminRows.find((item) => item.id === id);
    if (!source) throw new Error("Article not found");

    const copy: AdminArticle = {
      ...source,
      id: crypto.randomUUID(),
      slug: `${source.slug}-copy-${Date.now()}`,
      title: `${source.title} — αντίγραφο`,
      status: "Πρόχειρο",
      views: 0,
    };
    this.adminRows = [copy, ...this.adminRows];
    return cloneAdminArticle(copy);
  }

  async delete(id: string) {
    this.adminRows = this.adminRows.filter((item) => item.id !== id);
  }
}

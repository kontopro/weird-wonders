import type { ArticleStatus } from "@/domain/article-status";

/**
 * Scheduled publishing without a background job: a `scheduled` article becomes
 * public as soon as its publish time has passed, and is shown as published
 * from then on. Every adapter applies these same rules (the database mirrors
 * them in its RLS policies), so mock mode and production agree.
 */

/** A scheduled article goes live at the start of its chosen day (UTC). */
export function scheduledAtFor(dateValue: string): string {
  return `${dateValue}T00:00:00.000Z`;
}

type Schedulable = { status: ArticleStatus; scheduledAt: string | null };

export function isPubliclyVisible(article: Schedulable, now: Date = new Date()): boolean {
  if (article.status === "published") return true;
  return (
    article.status === "scheduled" &&
    article.scheduledAt !== null &&
    Date.parse(article.scheduledAt) <= now.getTime()
  );
}

/** The status people should see: a scheduled article whose time has come is published. */
export function effectiveStatus(article: Schedulable, now: Date = new Date()): ArticleStatus {
  return article.status === "scheduled" && isPubliclyVisible(article, now)
    ? "published"
    : article.status;
}

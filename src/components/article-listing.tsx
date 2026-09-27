import type { ReactNode } from "react";
import { ArticleCard } from "@/components/article-card";
import { Pager } from "@/components/pager";
import type { Page } from "@/domain/listing";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useT } from "@/i18n";
import type { Article } from "@/lib/articles";

/** Shared layout for category, tag and author pages. */
export function ArticleListing({
  eyebrow,
  title,
  intro,
  page,
  emptyMessage,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  page: Page<Article>;
  emptyMessage: string;
}) {
  const { bookmarks, toggle } = useBookmarks();
  const t = useT();
  return (
    <div className="section-shell page-top">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      {intro && <div className="listing-intro">{intro}</div>}
      <p className="results-label">{t.common.articleCount(page.total)}</p>
      {page.items.length ? (
        <>
          <div className="article-grid">
            {page.items.map((article) => (
              <ArticleCard
                key={article.slug}
                article={article}
                saved={bookmarks.includes(article.slug)}
                onBookmark={() => toggle(article.slug)}
              />
            ))}
          </div>
          <Pager page={page} />
        </>
      ) : (
        <div className="empty-state">
          <span>?</span>
          <h2>{emptyMessage}</h2>
        </div>
      )}
    </div>
  );
}

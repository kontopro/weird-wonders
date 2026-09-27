import type { ReactNode } from "react";
import { ArticleCard } from "@/components/article-card";
import { useBookmarks } from "@/hooks/use-bookmarks";
import type { Article } from "@/lib/articles";

/** Shared layout for category, tag and author pages. */
export function ArticleListing({
  eyebrow,
  title,
  intro,
  articles,
  emptyMessage,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  articles: Article[];
  emptyMessage: string;
}) {
  const { bookmarks, toggle } = useBookmarks();
  return (
    <div className="section-shell page-top">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      {intro && <div className="listing-intro">{intro}</div>}
      <p className="results-label">
        {articles.length === 1 ? "1 άρθρο" : `${articles.length} άρθρα`}
      </p>
      {articles.length ? (
        <div className="article-grid">
          {articles.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              saved={bookmarks.includes(article.slug)}
              onBookmark={() => toggle(article.slug)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span>?</span>
          <h2>{emptyMessage}</h2>
        </div>
      )}
    </div>
  );
}

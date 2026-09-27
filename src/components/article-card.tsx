import { Link } from "@tanstack/react-router";
import { Bookmark, Clock } from "lucide-react";
import type { Article } from "@/lib/articles";
import { categoryClass } from "@/lib/category-class";
import { Button } from "@/components/ui/button";
import { formatDate, useT } from "@/i18n";
import { useLocalized } from "@/i18n/links";

export function ArticleCard({
  article,
  saved,
  onBookmark,
}: {
  article: Article;
  saved?: boolean;
  onBookmark?: () => void;
}) {
  const t = useT();
  const { lang, lp } = useLocalized();
  return (
    <article className="story-card group">
      <Link
        to="/{-$lang}/arthro/$slug"
        params={{ lang: lp, slug: article.slug }}
        className="story-image-wrap"
      >
        <img
          src={article.image}
          alt=""
          width={1200}
          height={900}
          loading="lazy"
          className="story-image"
        />
      </Link>
      <div className="story-body">
        <div className="meta-row">
          <Link
            to="/{-$lang}/katigoria/$slug"
            params={{ lang: lp, slug: article.category.slug }}
            className={`category-pill ${categoryClass(article.category)}`}
          >
            {article.category.name}
          </Link>
          {onBookmark && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBookmark}
              aria-label={saved ? t.common.removeBookmark : t.common.saveArticle}
            >
              <Bookmark className={saved ? "bookmark-active" : ""} />
            </Button>
          )}
        </div>
        <Link to="/{-$lang}/arthro/$slug" params={{ lang: lp, slug: article.slug }}>
          <h3>{article.title}</h3>
        </Link>
        <p>{article.excerpt}</p>
        <div className="story-footer">
          <span>{formatDate(article.dateValue, lang)}</span>
          <span>
            <Clock /> {t.common.readingTime(article.minutes)}
          </span>
        </div>
      </div>
    </article>
  );
}

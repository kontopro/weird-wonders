import { Link } from "@tanstack/react-router";
import { Bookmark, Clock } from "lucide-react";
import type { Article } from "@/lib/articles";
import { categoryClass } from "@/lib/category-class";
import { Button } from "@/components/ui/button";

export function ArticleCard({
  article,
  saved,
  onBookmark,
}: {
  article: Article;
  saved?: boolean;
  onBookmark?: () => void;
}) {
  return (
    <article className="story-card group">
      <Link to="/arthro/$slug" params={{ slug: article.slug }} className="story-image-wrap">
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
            to="/katigoria/$slug"
            params={{ slug: article.category.slug }}
            className={`category-pill ${categoryClass(article.category)}`}
          >
            {article.category.name}
          </Link>
          {onBookmark && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBookmark}
              aria-label={saved ? "Αφαίρεση σελιδοδείκτη" : "Αποθήκευση άρθρου"}
            >
              <Bookmark className={saved ? "bookmark-active" : ""} />
            </Button>
          )}
        </div>
        <Link to="/arthro/$slug" params={{ slug: article.slug }}>
          <h3>{article.title}</h3>
        </Link>
        <p>{article.excerpt}</p>
        <div className="story-footer">
          <span>{article.date}</span>
          <span>
            <Clock /> {article.minutes} λεπτά ανάγνωσης
          </span>
        </div>
      </div>
    </article>
  );
}

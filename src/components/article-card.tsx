import { Link } from "@tanstack/react-router";
import { Bookmark, Clock } from "lucide-react";
import type { Article } from "@/lib/articles";
import { categoryStyles } from "@/lib/articles";
import { Button } from "@/components/ui/button";

export function ArticleCard({ article, saved, onBookmark }: { article: Article; saved?: boolean; onBookmark?: () => void }) {
  return (
    <article className="story-card group">
      <Link to="/arthro/$slug" params={{ slug: article.slug }} className="story-image-wrap">
        <img src={article.image} alt="" width={1200} height={900} loading="lazy" className="story-image" />
      </Link>
      <div className="story-body">
        <div className="meta-row">
          <span className={`category-pill ${categoryStyles[article.category]}`}>{article.category}</span>
          {onBookmark && <Button variant="ghost" size="icon" onClick={onBookmark} aria-label={saved ? "Αφαίρεση σελιδοδείκτη" : "Αποθήκευση άρθρου"}><Bookmark className={saved ? "bookmark-active" : ""} /></Button>}
        </div>
        <Link to="/arthro/$slug" params={{ slug: article.slug }}><h3>{article.title}</h3></Link>
        <p>{article.excerpt}</p>
        <div className="story-footer"><span>{article.date}</span><span><Clock /> {article.minutes} λεπτά ανάγνωσης</span></div>
      </div>
    </article>
  );
}
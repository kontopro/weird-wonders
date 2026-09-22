import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Bookmark, CheckCircle2, Clock, Link2, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { categoryStyles } from "@/lib/articles";
import { articleRepository } from "@/data/articles";
import { ArticleCard } from "@/components/article-card";
import { ArticleContentRenderer } from "@/components/article-content-renderer";
import { getArticleHeadings } from "@/lib/article-content";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { brandedTitle, siteConfig } from "@/config/site";

export const Route = createFileRoute("/arthro/$slug")({
  loader: async ({ params }) => {
    const [article, articles] = await Promise.all([
      articleRepository.findPublishedBySlug(params.slug),
      articleRepository.listPublished(),
    ]);
    if (!article) throw notFound();
    return { article, related: articles.filter((item) => item.slug !== article.slug).slice(0, 3) };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: brandedTitle(loaderData?.article.title ?? "Άρθρο") },
      {
        name: "description",
        content: loaderData?.article.excerpt ?? `Μια ιστορία από το ${siteConfig.name}.`,
      },
      { property: "og:title", content: loaderData?.article.title ?? siteConfig.name },
      {
        property: "og:description",
        content: loaderData?.article.excerpt ?? "Μια απρόσμενη ιστορία.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArticlePage,
});
function ArticlePage() {
  const { article, related } = Route.useLoaderData();
  const { bookmarks, toggle } = useBookmarks();
  const [progress, setProgress] = useState(0);
  const [reaction, setReaction] = useState<string>();
  const headings = getArticleHeadings(article.content);
  useEffect(() => {
    const onScroll = () =>
      setProgress(
        Math.min(
          100,
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100,
        ),
      );
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <div className="reading-progress" style={{ width: `${progress}%` }} />
      <article className="article-page">
        <header className="article-head section-shell">
          <div className="article-meta">
            <span className={`category-pill ${categoryStyles[article.category] ?? ""}`}>
              {article.category}
            </span>
            <span>{article.date}</span>
            <span>
              <Clock /> {article.minutes} λεπτά ανάγνωσης
            </span>
          </div>
          <h1>{article.title}</h1>
          <p className="article-deck">{article.excerpt}</p>
          <div className="author-row">
            <div className="author-avatar">{article.author.slice(0, 1)}</div>
            <div>
              <strong>{article.author}</strong>
              <small>Συντάκτρια περιεχομένου</small>
            </div>
            <div className="article-actions">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigator.share?.({ title: article.title, url: location.href })}
                aria-label="Κοινοποίηση"
              >
                <Share2 />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggle(article.slug)}
                aria-label="Σελιδοδείκτης"
              >
                <Bookmark className={bookmarks.includes(article.slug) ? "bookmark-active" : ""} />
              </Button>
            </div>
          </div>
        </header>
        <div className="article-visual section-shell">
          <img src={article.image} alt="Εικόνα παρουσίασης του άρθρου" width={1600} height={1000} />
        </div>
        <div className="demo-notice section-shell">
          <CheckCircle2 />
          <p>
            <strong>Demo περιεχόμενο.</strong> Οι πληροφορίες ελέγχονται και συνοδεύονται από πηγές
            πριν από τη δημοσίευση.
          </p>
        </div>
        <div className="article-layout section-shell">
          <aside className="toc">
            <p>Σε αυτό το άρθρο</p>
            {headings.map((heading) => (
              <a key={heading.id} href={`#${heading.id}`}>
                {heading.text}
              </a>
            ))}
          </aside>
          <div className="article-copy">
            <ArticleContentRenderer
              document={article.content}
              resolveAsset={(assetId) => article.mediaAssets[assetId]}
            />
            <section className="sources">
              <h2>Πηγές & βιβλιογραφία</h2>
              <ol>
                <li>Demo αναφορά — θα αντικατασταθεί από επαληθευμένη επιστημονική πηγή.</li>
                <li>Demo αναφορά — ανασκόπηση μυκορριζικών δικτύων.</li>
              </ol>
            </section>
            <div className="tags">
              <span>δάσος</span>
              <span>μύκητες</span>
              <span>οικοσύστημα</span>
            </div>
            <section className="reaction">
              <h2>Το γνώριζες;</h2>
              <p>Η απάντησή σου παραμένει μόνο σε αυτή τη συσκευή.</p>
              <div>
                <Button
                  variant={reaction === "yes" ? "default" : "outline"}
                  onClick={() => setReaction("yes")}
                >
                  <ThumbsUp /> Ναι
                </Button>
                <Button
                  variant={reaction === "no" ? "default" : "outline"}
                  onClick={() => setReaction("no")}
                >
                  <ThumbsDown /> Όχι
                </Button>
              </div>
            </section>
          </div>
        </div>
      </article>
      <section className="section-shell section-block">
        <header className="section-heading">
          <h2>Συνέχισε την ανακάλυψη</h2>
          <Link to="/anakalyψε">Όλα τα άρθρα</Link>
        </header>
        <div className="article-grid related">
          {related.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>
    </>
  );
}

import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { Bookmark, CheckCircle2, Clock, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { ArticleCard } from "@/components/article-card";
import { ArticleContentRenderer } from "@/components/article-content-renderer";
import { ArticleSources } from "@/components/article-sources";
import { Button } from "@/components/ui/button";
import { brandedTitle, siteConfig } from "@/config/site";
import { articleApi } from "@/data/articles";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { formatDate, localizedPath, messagesFor, useT } from "@/i18n";
import { alternateLinks, langOf, ogLocale } from "@/i18n/head";
import { useLocalized } from "@/i18n/links";
import { getArticleHeadings } from "@/lib/article-content";
import { initialsOf } from "@/lib/auth-types";
import { categoryClass } from "@/lib/category-class";

export const Route = createFileRoute("/{-$lang}/arthro/$slug")({
  loader: async ({ params }) => {
    const language = langOf(params);
    const article = await articleApi.findPublishedBySlug(params.slug, language);
    if (!article) {
      // An old address of an article whose slug changed: redirect permanently.
      const current = await articleApi.resolveOldSlug(params.slug, language);
      if (current) {
        throw redirect({
          to: "/{-$lang}/arthro/$slug",
          params: { lang: params.lang, slug: current },
          statusCode: 301,
        });
      }
      throw notFound();
    }
    const articles = await articleApi.listPublished({ language, limit: 12 });
    // Related: same category first, then the most recent others.
    const others = articles.filter((item) => item.slug !== article.slug);
    const related = [
      ...others.filter((item) => item.category.slug === article.category.slug),
      ...others.filter((item) => item.category.slug !== article.category.slug),
    ].slice(0, 3);
    return { article, related };
  },
  head: ({ params, loaderData }) => {
    const language = langOf(params);
    const t = messagesFor(language);
    const article = loaderData?.article;
    // hreflang only for versions that exist and are public.
    const versions = article
      ? [{ language, slug: article.slug }, ...article.translations]
      : [{ language, slug: params.slug }];
    const pathFor = (version: string) =>
      localizedPath(
        version,
        `/arthro/${versions.find((item) => item.language === version)?.slug ?? params.slug}`,
      );
    return {
      meta: [
        { title: brandedTitle(article?.title ?? t.article.fallbackTitle) },
        {
          name: "description",
          content: article?.excerpt || t.article.fallbackDescription(siteConfig.name),
        },
        { property: "og:title", content: article?.title ?? siteConfig.name },
        { property: "og:description", content: article?.excerpt ?? "" },
        { property: "og:type", content: "article" },
        ogLocale(language),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: alternateLinks(
        language,
        pathFor,
        versions.map((item) => item.language),
      ),
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { article, related } = Route.useLoaderData();
  const t = useT();
  const { lang, lp } = useLocalized();
  const { bookmarks, toggle } = useBookmarks();
  const [progress, setProgress] = useState(0);
  const [reaction, setReaction] = useState<string>();
  const headings = getArticleHeadings(article.content);
  // Count one view per article per browser session (no visitor data is stored).
  useEffect(() => {
    const key = `viewed:${article.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage unavailable (private mode): count anyway.
    }
    void articleApi.recordView(article.id).catch(() => undefined);
  }, [article.id]);
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
      <article className="article-page" lang={article.language}>
        <header className="article-head section-shell">
          <div className="article-meta">
            <Link
              to="/{-$lang}/katigoria/$slug"
              params={{ lang: lp, slug: article.category.slug }}
              className={`category-pill ${categoryClass(article.category)}`}
            >
              {article.category.name}
            </Link>
            <span>{formatDate(article.dateValue, lang)}</span>
            <span>
              <Clock /> {t.common.readingTime(article.minutes)}
            </span>
          </div>
          <h1>{article.title}</h1>
          <p className="article-deck">{article.excerpt}</p>
          {article.translations.length > 0 && (
            <p className="language-switch">
              <span>{t.article.alsoIn}</span>
              {article.translations.map((version) => (
                <a
                  key={version.language}
                  href={localizedPath(version.language, `/arthro/${version.slug}`)}
                  hrefLang={version.language}
                  lang={version.language}
                >
                  {messagesFor(version.language).languageName}
                </a>
              ))}
            </p>
          )}
          <div className="author-row">
            <div className="author-avatar" aria-hidden="true">
              {initialsOf(article.author.name)}
            </div>
            <div>
              {article.author.slug ? (
                <Link
                  to="/{-$lang}/syntaktis/$slug"
                  params={{ lang: lp, slug: article.author.slug }}
                >
                  <strong>{article.author.name}</strong>
                </Link>
              ) : (
                <strong>{article.author.name}</strong>
              )}
              <small>{t.article.author}</small>
            </div>
            <div className="article-actions">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigator.share?.({ title: article.title, url: location.href })}
                aria-label={t.common.share}
              >
                <Share2 />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggle(article.slug)}
                aria-label={t.common.bookmark}
              >
                <Bookmark className={bookmarks.includes(article.slug) ? "bookmark-active" : ""} />
              </Button>
            </div>
          </div>
        </header>
        <div className="article-visual section-shell">
          {article.image && (
            <img src={article.image} alt={article.imageAlt} width={1600} height={1000} />
          )}
        </div>
        <div className="demo-notice section-shell">
          <CheckCircle2 />
          <p>
            <strong>{t.article.demoNoticeTitle}</strong> {t.article.demoNoticeText}
          </p>
        </div>
        <div className="article-layout section-shell">
          <aside className="toc">
            <p>{t.article.onThisPage}</p>
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
            <ArticleSources sources={article.content.sources} />
            {article.tags.length > 0 && (
              <div className="tags" aria-label={t.common.tags}>
                {article.tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    to="/{-$lang}/etiketa/$slug"
                    params={{ lang: lp, slug: tag.slug }}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
            <section className="reaction">
              <h2>{t.article.didYouKnow}</h2>
              <p>{t.article.reactionNote}</p>
              <div>
                <Button
                  variant={reaction === "yes" ? "default" : "outline"}
                  onClick={() => setReaction("yes")}
                >
                  <ThumbsUp /> {t.article.yes}
                </Button>
                <Button
                  variant={reaction === "no" ? "default" : "outline"}
                  onClick={() => setReaction("no")}
                >
                  <ThumbsDown /> {t.article.no}
                </Button>
              </div>
            </section>
          </div>
        </div>
      </article>
      <section className="section-shell section-block">
        <header className="section-heading">
          <h2>{t.article.continue}</h2>
          <Link to="/{-$lang}/anakalypse" params={{ lang: lp }}>
            {t.article.allArticles}
          </Link>
        </header>
        <div className="article-grid related">
          {related.map((item) => (
            <ArticleCard key={item.slug} article={item} />
          ))}
        </div>
      </section>
    </>
  );
}

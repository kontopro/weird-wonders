import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Clipboard, Clock, Share2, Sparkles } from "lucide-react";
import { useState } from "react";
import { articleApi } from "@/data/articles";
import { newsletterApi } from "@/data/newsletter";
import { taxonomyApi } from "@/data/taxonomy";
import { ArticleCard } from "@/components/article-card";
import { CategoryIcon } from "@/components/category-icon";
import { categoryClass } from "@/lib/category-class";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { siteConfig } from "@/config/site";
import { isDemoEmail } from "@/domain/newsletter";
import { getDataSource } from "@/lib/data-source";
import { localizedPath, messagesFor, useT } from "@/i18n";
import { langOf, sitewideAlternates } from "@/i18n/head";
import { socialMeta, websiteJsonLd } from "@/i18n/seo";
import { useLocalized } from "@/i18n/links";
import { imageSizes } from "@/lib/image-sizes";

export const Route = createFileRoute("/{-$lang}/")({
  loader: async ({ params }) => {
    const language = langOf(params);
    // Enough recent articles to find the featured and highlighted ones.
    const [articles, categories, popular] = await Promise.all([
      articleApi.listPublished({ language, limit: 24 }),
      taxonomyApi.listCategories(language),
      articleApi.listPopular(language, 5),
    ]);
    return { articles, categories, popular };
  },
  head: ({ params }) => {
    const language = langOf(params);
    const { seo } = messagesFor(language).site;
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.description },
        ...socialMeta({
          language,
          title: seo.socialTitle,
          description: seo.socialDescription,
          path: localizedPath(language, "/"),
        }),
      ],
      links: sitewideAlternates(language, "/"),
      scripts: [websiteJsonLd(language)],
    };
  },
  component: Index,
});

function Index() {
  const { articles, categories, popular } = Route.useLoaderData();
  const t = useT();
  const { lang, lp } = useLocalized();
  const { bookmarks, toggle } = useBookmarks();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  // Editors choose the lead story; otherwise the newest article leads.
  const featured = articles.find((article) => article.isFeatured) ?? articles[0];
  const others = articles.filter((article) => article !== featured);
  const highlighted = articles.find((article) => article.isHighlighted);
  const labels = t.site.contentLabels;
  // A freshly created blog (or language) has no articles yet: show a friendly empty state.
  if (!featured) {
    return (
      <div className="section-shell page-top">
        <div className="empty-state">
          <span>✦</span>
          <h2>{t.home.emptyTitle(labels.plural)}</h2>
          <p>{t.home.emptyText}</p>
        </div>
      </div>
    );
  }
  const highlightText = highlighted ? highlighted.excerpt || highlighted.title : "";
  const subscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setMessage({ ok: false, text: t.home.invalidEmail });
      return;
    }
    if (getDataSource() === "mock" && !isDemoEmail(email)) {
      setMessage({ ok: false, text: t.home.demoEmailOnly });
      return;
    }
    setSubscribing(true);
    try {
      await newsletterApi.subscribe({ email, language: lang });
      setMessage({ ok: true, text: t.home.subscribed });
      setEmail("");
    } catch {
      setMessage({ ok: false, text: t.home.subscribeFailed });
    } finally {
      setSubscribing(false);
    }
  };
  return (
    <div>
      <section className="hero section-shell">
        <div className="hero-lead">
          <img
            src={featured.image || undefined}
            srcSet={featured.imageSrcSet || undefined}
            sizes={featured.imageSrcSet ? imageSizes.hero : undefined}
            alt=""
            width={1600}
            height={1008}
            className="hero-image"
            fetchPriority="high"
          />
          <div className="hero-overlay">
            <span className={`category-pill ${categoryClass(featured.category)}`}>
              {featured.category.name}
            </span>
            <h1>{featured.title}</h1>
            <p>{featured.excerpt}</p>
            <div className="hero-meta">
              <span>
                <Clock /> {t.common.readingTime(featured.minutes)}
              </span>
              <Link
                to="/{-$lang}/arthro/$slug"
                params={{ lang: lp, slug: featured.slug }}
                className="link-button"
              >
                {t.home.discoverIt} <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
        <div className="trending-stack">
          <div className="section-kicker">
            <span>{t.home.trendingKicker}</span>
            <Sparkles />
          </div>
          {others.slice(0, 2).map((article, index) => (
            <Link
              key={article.slug}
              to="/{-$lang}/arthro/$slug"
              params={{ lang: lp, slug: article.slug }}
              className="trending-card"
            >
              <img
                src={article.image || undefined}
                srcSet={article.imageSrcSet || undefined}
                sizes={article.imageSrcSet ? imageSizes.thumb : undefined}
                alt=""
                width={1200}
                height={900}
              />
              <div>
                <span>
                  0{index + 1} · {article.category.name}
                </span>
                <h2>{article.title}</h2>
                <p>{t.common.readingTime(article.minutes)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Shown only when an editor has highlighted a published article. */}
      {highlighted && (
        <section className="fact-band">
          <div className="section-shell fact-layout">
            <div>
              <p className="eyebrow">{labels.highlight}</p>
              <h2>{revealed ? highlightText : t.home.highlightPrompt}</h2>
              <div className="fact-actions">
                <Button onClick={() => setRevealed(true)}>
                  {revealed ? t.home.revealed : t.home.reveal}
                </Button>
                {revealed && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(highlightText);
                        setCopied(true);
                      }}
                    >
                      <Clipboard /> {copied ? t.home.copied : t.home.copy}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigator.share?.({ title: siteConfig.name, text: highlightText })
                      }
                      aria-label={t.common.share}
                    >
                      <Share2 />
                    </Button>
                    <Link
                      to="/{-$lang}/arthro/$slug"
                      params={{ lang: lp, slug: highlighted.slug }}
                      className="link-button"
                    >
                      {t.home.readArticle} <ArrowRight />
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className={`fact-mark ${revealed ? "revealed" : ""}`}>F</div>
          </div>
        </section>
      )}

      <section className="section-shell section-block">
        <header className="section-heading">
          <div>
            <p className="eyebrow">{t.home.categoriesEyebrow}</p>
            <h2>{t.home.categoriesTitle}</h2>
          </div>
          <Link to="/{-$lang}/katigories" params={{ lang: lp }}>
            {t.home.allCategories} <ArrowRight />
          </Link>
        </header>
        <div className="category-grid">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to="/{-$lang}/katigoria/$slug"
              params={{ lang: lp, slug: category.slug }}
              className={`category-tile ${categoryClass(category)}`}
            >
              <CategoryIcon iconKey={category.iconKey} />
              <span>{category.name}</span>
              <small>{t.home.explore}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell section-block">
        <header className="section-heading">
          <div>
            <p className="eyebrow">{t.home.latestEyebrow}</p>
            <h2>{t.home.latestTitle(labels.plural)}</h2>
          </div>
          <Link to="/{-$lang}/anakalypse" params={{ lang: lp }}>
            {t.home.seeAll} <ArrowRight />
          </Link>
        </header>
        <div className="article-grid">
          {articles.slice(0, 6).map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              saved={bookmarks.includes(article.slug)}
              onBookmark={() => toggle(article.slug)}
            />
          ))}
        </div>
      </section>

      <section className="popular-band">
        <div className="section-shell popular-layout">
          <div>
            <p className="eyebrow">{t.home.popularEyebrow}</p>
            <h2>{t.home.popularTitle}</h2>
          </div>
          <ol>
            {popular.map((article, index) => (
              <li key={article.slug}>
                <span>0{index + 1}</span>
                <Link to="/{-$lang}/arthro/$slug" params={{ lang: lp, slug: article.slug }}>
                  {article.title}
                </Link>
                <small>{article.category.name}</small>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-shell newsletter">
        <div>
          <p className="eyebrow">{t.home.newsletterEyebrow}</p>
          <h2>{t.home.newsletterTitle}</h2>
        </div>
        <form onSubmit={(event) => void subscribe(event)} noValidate>
          <label htmlFor="newsletter-email">{t.home.emailLabel}</label>
          <div>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.home.emailPlaceholder}
            />
            <Button type="submit" disabled={subscribing}>
              {t.home.subscribe} <ArrowRight />
            </Button>
          </div>
          <p className="newsletter-consent">{t.home.consent}</p>
          {message && (
            <p className={message.ok ? "success" : "error"}>
              {message.ok && <Check />} {message.text}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ArticleCard } from "@/components/article-card";
import { brandedTitle } from "@/config/site";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { messagesFor, useT } from "@/i18n";
import { langOf, ogLocale, sitewideAlternates } from "@/i18n/head";
import { useLocalized } from "@/i18n/links";

type Duration = "any" | "short" | "long";

export const Route = createFileRoute("/{-$lang}/anakalypse")({
  loader: async ({ params }) => {
    const language = langOf(params);
    const [articles, categories] = await Promise.all([
      articleApi.listPublished({ language }),
      taxonomyApi.listCategories(language),
    ]);
    return { articles, categories };
  },
  validateSearch: z.object({ category: z.string().optional() }),
  head: ({ params }) => {
    const language = langOf(params);
    const t = messagesFor(language).discover;
    return {
      meta: [
        { title: brandedTitle(t.title) },
        { name: "description", content: t.description },
        { property: "og:title", content: brandedTitle(t.title) },
        { property: "og:description", content: t.socialDescription },
        { property: "og:type", content: "website" },
        ogLocale(language),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: sitewideAlternates(language, "/anakalypse"),
    };
  },
  component: Discover,
});

function Discover() {
  const { articles, categories } = Route.useLoaderData();
  const initial = Route.useSearch();
  const t = useT();
  const { lang } = useLocalized();
  const [query, setQuery] = useState("");
  // Category filter holds a slug; "" means all categories.
  const [category, setCategory] = useState(initial.category ?? "");
  const [duration, setDuration] = useState<Duration>("any");
  const [sort, setSort] = useState("recent");
  const { bookmarks, toggle } = useBookmarks();
  const results = useMemo(
    () =>
      articles
        .filter(
          (article) =>
            [article.title, article.excerpt, ...article.tags.map((tag) => tag.name)]
              .join(" ")
              .toLocaleLowerCase(lang)
              .includes(query.toLocaleLowerCase(lang)) &&
            (category === "" || article.category.slug === category) &&
            (duration === "any" ||
              (duration === "short" ? article.minutes <= 5 : article.minutes > 5)),
        )
        .sort((a, b) =>
          sort === "popular"
            ? b.popularity - a.popularity
            : articles.indexOf(a) - articles.indexOf(b),
        ),
    [articles, query, category, duration, sort, lang],
  );
  return (
    <div className="section-shell page-top">
      <p className="eyebrow">{t.discover.eyebrow}</p>
      <h1 className="page-title">{t.discover.title}</h1>
      <div className="filters">
        <label className="search-box">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.discover.searchPlaceholder}
            aria-label={t.nav.search}
          />
        </label>
        <label>
          <span>{t.discover.category}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t.discover.all}</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.discover.time}</span>
          <select value={duration} onChange={(e) => setDuration(e.target.value as Duration)}>
            <option value="any">{t.discover.anyTime}</option>
            <option value="short">{t.discover.short}</option>
            <option value="long">{t.discover.long}</option>
          </select>
        </label>
        <label>
          <span>{t.discover.sort}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">{t.discover.recent}</option>
            <option value="popular">{t.discover.popular}</option>
          </select>
        </label>
      </div>
      <div className="results-label">
        <SlidersHorizontal /> {t.common.resultCount(results.length)}
      </div>
      {results.length ? (
        <div className="article-grid">
          {results.map((article) => (
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
          <h2>{t.discover.emptyTitle}</h2>
          <p>{t.discover.emptyText}</p>
        </div>
      )}
    </div>
  );
}

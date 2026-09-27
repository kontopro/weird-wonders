import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { ArticleCard } from "@/components/article-card";
import { Pager } from "@/components/pager";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import type { PublishedArticleFilter } from "@/data/articles";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { localizedPath, messagesFor, useT } from "@/i18n";
import { langOf, sitewideAlternates } from "@/i18n/head";
import { socialMeta } from "@/i18n/seo";

/** Reading-time buckets (minutes). */
const lengths = { short: { maxMinutes: 5 }, long: { minMinutes: 6 } } as const;

const searchSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  category: z.string().max(200).optional().catch(undefined),
  length: z.enum(["short", "long"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/{-$lang}/anakalypse")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const language = langOf(params);
    const filter: PublishedArticleFilter = {
      language,
      ...(deps.category ? { categorySlug: deps.category } : {}),
      ...(deps.length ? lengths[deps.length] : {}),
    };
    const [page, categories] = await Promise.all([
      deps.q
        ? articleApi.search(deps.q, filter, deps.page ?? 1)
        : articleApi.pagePublished(filter, deps.page ?? 1),
      taxonomyApi.listCategories(language),
    ]);
    return { page, categories };
  },
  head: ({ params }) => {
    const language = langOf(params);
    const t = messagesFor(language).discover;
    return {
      meta: [
        { title: brandedTitle(t.title) },
        ...socialMeta({
          language,
          title: brandedTitle(t.title),
          description: t.socialDescription,
          path: localizedPath(language, "/anakalypse"),
        }),
        { name: "description", content: t.description },
      ],
      links: sitewideAlternates(language, "/anakalypse"),
    };
  },
  component: Discover,
});

function Discover() {
  const { page, categories } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const t = useT();
  const { bookmarks, toggle } = useBookmarks();
  const [query, setQuery] = useState(search.q ?? "");

  /** Any filter change starts again from page 1. */
  const update = (next: Partial<z.infer<typeof searchSchema>>) =>
    navigate({
      search: (previous) => {
        const merged = { ...previous, ...next, page: undefined };
        return Object.fromEntries(
          Object.entries(merged).filter(([, value]) => value !== undefined && value !== ""),
        );
      },
    });

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    void update({ q: query.trim() || undefined });
  };

  return (
    <div className="section-shell page-top">
      <p className="eyebrow">{t.discover.eyebrow}</p>
      <h1 className="page-title">{t.discover.title}</h1>
      <div className="filters">
        <form className="search-box" role="search" onSubmit={onSearch}>
          <Search />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.discover.searchPlaceholder}
            aria-label={t.nav.search}
          />
          <Button type="submit" size="sm">
            {t.discover.searchButton}
          </Button>
        </form>
        <label>
          <span>{t.discover.category}</span>
          <select
            value={search.category ?? ""}
            onChange={(e) => void update({ category: e.target.value || undefined })}
          >
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
          <select
            value={search.length ?? ""}
            onChange={(e) =>
              void update({ length: (e.target.value || undefined) as "short" | "long" | undefined })
            }
          >
            <option value="">{t.discover.anyTime}</option>
            <option value="short">{t.discover.short}</option>
            <option value="long">{t.discover.long}</option>
          </select>
        </label>
      </div>
      <div className="results-label">
        <SlidersHorizontal /> {t.common.resultCount(page.total)}
        {search.q ? ` ${t.discover.resultsFor(search.q)}` : ""}
      </div>
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
          <h2>{t.discover.emptyTitle}</h2>
          <p>{t.discover.emptyText}</p>
        </div>
      )}
    </div>
  );
}

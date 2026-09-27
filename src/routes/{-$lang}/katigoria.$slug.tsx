import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { ArticleListing } from "@/components/article-listing";
import { brandedTitle } from "@/config/site";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";
import { localizedPath, messagesFor, useT } from "@/i18n";
import { alternateLinks, langOf, ogLocale } from "@/i18n/head";

export const Route = createFileRoute("/{-$lang}/katigoria/$slug")({
  validateSearch: z.object({ page: z.coerce.number().int().min(1).optional() }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ params, deps }) => {
    const language = langOf(params);
    const [category, page] = await Promise.all([
      taxonomyApi.findCategoryBySlug(params.slug, language),
      articleApi.pagePublished({ language, categorySlug: params.slug }, deps.page),
    ]);
    if (!category) throw notFound();
    return { category, page };
  },
  head: ({ params, loaderData }) => {
    const language = langOf(params);
    const t = messagesFor(language);
    const category = loaderData?.category;
    const name = category?.name ?? t.categoryPage.eyebrow;
    const slugs = category?.slugsByLanguage ?? { [language]: params.slug };
    return {
      meta: [
        { title: brandedTitle(name) },
        { name: "description", content: category?.description ?? "" },
        { property: "og:title", content: brandedTitle(name) },
        { property: "og:type", content: "website" },
        ogLocale(language),
      ],
      links: alternateLinks(
        language,
        (version) => localizedPath(version, `/katigoria/${slugs[version] ?? params.slug}`),
        Object.keys(slugs),
      ),
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category, page } = Route.useLoaderData();
  const t = useT();
  return (
    <ArticleListing
      eyebrow={t.categoryPage.eyebrow}
      title={category.name}
      intro={category.description ? <p>{category.description}</p> : undefined}
      page={page}
      emptyMessage={t.categoryPage.empty}
    />
  );
}

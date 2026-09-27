import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { ArticleListing } from "@/components/article-listing";
import { brandedTitle } from "@/config/site";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";
import { localizedPath, messagesFor, useT } from "@/i18n";
import { alternateLinks, langOf, paginatedLinks } from "@/i18n/head";
import { socialMeta } from "@/i18n/seo";

export const Route = createFileRoute("/{-$lang}/etiketa/$slug")({
  validateSearch: z.object({ page: z.coerce.number().int().min(1).optional() }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ params, deps }) => {
    const language = langOf(params);
    const [tag, page] = await Promise.all([
      taxonomyApi.findTagBySlug(params.slug, language),
      articleApi.pagePublished({ language, tagSlug: params.slug }, deps.page),
    ]);
    if (!tag) throw notFound();
    return { tag, page };
  },
  head: ({ params, loaderData }) => {
    const language = langOf(params);
    const t = messagesFor(language);
    const tag = loaderData?.tag;
    const slugs = tag?.slugsByLanguage ?? { [language]: params.slug };
    return {
      meta: [
        { title: brandedTitle(`#${tag?.name ?? params.slug}`) },
        { name: "description", content: t.tagPage.description(tag?.name ?? "") },
        ...socialMeta({
          language,
          title: brandedTitle(`#${tag?.name ?? params.slug}`),
          description: t.tagPage.description(tag?.name ?? ""),
          path: localizedPath(language, `/etiketa/${params.slug}`),
        }),
      ],
      links: paginatedLinks(
        alternateLinks(
          language,
          (version) => localizedPath(version, `/etiketa/${slugs[version] ?? params.slug}`),
          Object.keys(slugs),
        ),
        loaderData?.page.page,
      ),
    };
  },
  component: TagPage,
});

function TagPage() {
  const { tag, page } = Route.useLoaderData();
  const t = useT();
  return (
    <ArticleListing
      eyebrow={t.tagPage.eyebrow}
      title={`#${tag.name}`}
      page={page}
      emptyMessage={t.tagPage.empty}
    />
  );
}

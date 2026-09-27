import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleListing } from "@/components/article-listing";
import { brandedTitle } from "@/config/site";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";
import { localizedPath, messagesFor, useT } from "@/i18n";
import { alternateLinks, langOf, ogLocale } from "@/i18n/head";

export const Route = createFileRoute("/{-$lang}/etiketa/$slug")({
  loader: async ({ params }) => {
    const language = langOf(params);
    const [tag, articles] = await Promise.all([
      taxonomyApi.findTagBySlug(params.slug, language),
      articleApi.listPublished({ language, tagSlug: params.slug }),
    ]);
    if (!tag) throw notFound();
    return { tag, articles };
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
        { property: "og:type", content: "website" },
        ogLocale(language),
      ],
      links: alternateLinks(
        language,
        (version) => localizedPath(version, `/etiketa/${slugs[version] ?? params.slug}`),
        Object.keys(slugs),
      ),
    };
  },
  component: TagPage,
});

function TagPage() {
  const { tag, articles } = Route.useLoaderData();
  const t = useT();
  return (
    <ArticleListing
      eyebrow={t.tagPage.eyebrow}
      title={`#${tag.name}`}
      articles={articles}
      emptyMessage={t.tagPage.empty}
    />
  );
}

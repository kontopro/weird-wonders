import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleListing } from "@/components/article-listing";
import { brandedTitle } from "@/config/site";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";

export const Route = createFileRoute("/etiketa/$slug")({
  loader: async ({ params }) => {
    const [tag, articles] = await Promise.all([
      taxonomyApi.findTagBySlug(params.slug),
      articleApi.listPublished({ tagSlug: params.slug }),
    ]);
    if (!tag) throw notFound();
    return { tag, articles };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: brandedTitle(`#${loaderData?.tag.name ?? "ετικέτα"}`) },
      { name: "description", content: `Άρθρα με την ετικέτα «${loaderData?.tag.name ?? ""}».` },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TagPage,
});

function TagPage() {
  const { tag, articles } = Route.useLoaderData();
  return (
    <ArticleListing
      eyebrow="Ετικέτα"
      title={`#${tag.name}`}
      articles={articles}
      emptyMessage="Δεν υπάρχουν ακόμα δημοσιευμένα άρθρα με αυτή την ετικέτα."
    />
  );
}

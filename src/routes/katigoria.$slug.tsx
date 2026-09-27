import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleListing } from "@/components/article-listing";
import { brandedTitle } from "@/config/site";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";

export const Route = createFileRoute("/katigoria/$slug")({
  loader: async ({ params }) => {
    const [category, articles] = await Promise.all([
      taxonomyApi.findCategoryBySlug(params.slug),
      articleApi.listPublished({ categorySlug: params.slug }),
    ]);
    if (!category) throw notFound();
    return { category, articles };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: brandedTitle(loaderData?.category.name ?? "Κατηγορία") },
      { name: "description", content: loaderData?.category.description ?? "" },
      { property: "og:title", content: brandedTitle(loaderData?.category.name ?? "Κατηγορία") },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { category, articles } = Route.useLoaderData();
  return (
    <ArticleListing
      eyebrow="Κατηγορία"
      title={category.name}
      intro={category.description ? <p>{category.description}</p> : undefined}
      articles={articles}
      emptyMessage="Δεν υπάρχουν ακόμα άρθρα σε αυτή την κατηγορία."
    />
  );
}

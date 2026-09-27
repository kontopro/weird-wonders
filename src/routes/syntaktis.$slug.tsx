import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleListing } from "@/components/article-listing";
import { brandedTitle } from "@/config/site";
import { articleApi } from "@/data/articles";
import { authorApi } from "@/data/authors";
import { initialsOf } from "@/lib/auth-types";

export const Route = createFileRoute("/syntaktis/$slug")({
  loader: async ({ params }) => {
    const [author, articles] = await Promise.all([
      authorApi.findPublicBySlug(params.slug),
      articleApi.listPublished({ authorSlug: params.slug }),
    ]);
    if (!author) throw notFound();
    return { author, articles };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: brandedTitle(loaderData?.author.displayName ?? "Συντάκτης") },
      { name: "description", content: loaderData?.author.bio ?? "" },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: AuthorPage,
});

function AuthorPage() {
  const { author, articles } = Route.useLoaderData();
  return (
    <ArticleListing
      eyebrow="Συντάκτης"
      title={author.displayName}
      intro={
        <div className="author-row">
          <div className="author-avatar" aria-hidden="true">
            {initialsOf(author.displayName)}
          </div>
          {author.bio && <p>{author.bio}</p>}
        </div>
      }
      articles={articles}
      emptyMessage="Δεν υπάρχουν ακόμα δημοσιευμένα άρθρα."
    />
  );
}

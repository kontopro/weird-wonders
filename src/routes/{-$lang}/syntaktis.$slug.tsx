import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { ArticleListing } from "@/components/article-listing";
import { brandedTitle } from "@/config/site";
import { articleApi } from "@/data/articles";
import { authorApi } from "@/data/authors";
import { messagesFor, useT } from "@/i18n";
import { langOf, ogLocale, sitewideAlternates } from "@/i18n/head";
import { initialsOf } from "@/lib/auth-types";

export const Route = createFileRoute("/{-$lang}/syntaktis/$slug")({
  validateSearch: z.object({ page: z.coerce.number().int().min(1).optional() }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ params, deps }) => {
    const language = langOf(params);
    const [author, page] = await Promise.all([
      authorApi.findPublicBySlug(params.slug),
      articleApi.pagePublished({ language, authorSlug: params.slug }, deps.page),
    ]);
    if (!author) throw notFound();
    return { author, page };
  },
  head: ({ params, loaderData }) => {
    const language = langOf(params);
    return {
      meta: [
        {
          title: brandedTitle(
            loaderData?.author.displayName ?? messagesFor(language).authorPage.eyebrow,
          ),
        },
        { name: "description", content: loaderData?.author.bio ?? "" },
        { property: "og:type", content: "profile" },
        ogLocale(language),
      ],
      links: sitewideAlternates(language, `/syntaktis/${params.slug}`),
    };
  },
  component: AuthorPage,
});

function AuthorPage() {
  const { author, page } = Route.useLoaderData();
  const t = useT();
  return (
    <ArticleListing
      eyebrow={t.authorPage.eyebrow}
      title={author.displayName}
      intro={
        <div className="author-row">
          <div className="author-avatar" aria-hidden="true">
            {initialsOf(author.displayName)}
          </div>
          {author.bio && <p>{author.bio}</p>}
        </div>
      }
      page={page}
      emptyMessage={t.authorPage.empty}
    />
  );
}

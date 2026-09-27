import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleEditor } from "@/components/admin/article-editor";
import { brandedTitle } from "@/config/site";
import { articleApi } from "@/data/articles";
import { taxonomyApi } from "@/data/taxonomy";

export const Route = createFileRoute("/admin/articles/$id/edit")({
  loader: async ({ params }) => {
    const [article, categories, tags] = await Promise.all([
      articleApi.findAdminById(params.id),
      taxonomyApi.listCategories(),
      taxonomyApi.listTags(),
    ]);
    if (!article) throw notFound();
    return { article, categories, tags };
  },
  component: EditArticle,
  head: ({ loaderData }) => ({
    meta: [{ title: brandedTitle(loaderData?.article.title ?? "Επεξεργασία") }],
  }),
});

function EditArticle() {
  const { article, categories, tags } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  return (
    <ArticleEditor
      key={article.id}
      article={article}
      categories={categories}
      tagSuggestions={tags}
      user={user}
    />
  );
}

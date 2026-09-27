import { createFileRoute } from "@tanstack/react-router";
import { ArticleEditor } from "@/components/admin/article-editor";
import { brandedTitle } from "@/config/site";
import { taxonomyApi } from "@/data/taxonomy";

export const Route = createFileRoute("/admin/articles/new")({
  loader: async () => {
    const [categories, tags] = await Promise.all([
      taxonomyApi.listCategories(),
      taxonomyApi.listTags(),
    ]);
    return { categories, tags };
  },
  component: NewArticle,
  head: () => ({ meta: [{ title: brandedTitle("Νέο άρθρο") }] }),
});

function NewArticle() {
  const { categories, tags } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  return <ArticleEditor categories={categories} tagSuggestions={tags} user={user} />;
}

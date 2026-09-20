import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleEditor } from "@/components/admin/article-editor";
import { adminArticles } from "@/lib/admin-data";
import { brandedTitle, siteConfig } from "@/config/site";
export const Route = createFileRoute("/admin/articles/$slug/edit")({ loader: ({ params }) => { const article=adminArticles.find(item=>item.slug===params.slug); if(!article) throw notFound(); return article; }, component: EditArticle, head: ({ loaderData }) => ({ meta: [{ title: brandedTitle(loaderData?.title ?? "Επεξεργασία") }, { name: "description", content: `Επεξεργασία άρθρου στο frontend prototype του ${siteConfig.name}.` }, { property: "og:title", content: brandedTitle("Επεξεργασία άρθρου") }, { property: "og:description", content: `Επεξεργασία άρθρου στο frontend prototype του ${siteConfig.name}.` }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }) });
function EditArticle(){ return <ArticleEditor article={Route.useLoaderData()} />; }

import { createFileRoute } from "@tanstack/react-router";
import { ArticleEditor } from "@/components/admin/article-editor";
import { brandedTitle, siteConfig } from "@/config/site";
export const Route = createFileRoute("/admin/articles/new")({ component: () => <ArticleEditor />, head: () => ({ meta: [{ title: brandedTitle("Νέο άρθρο") }, { name: "description", content: `Δημιουργία νέου άρθρου στο frontend prototype του ${siteConfig.name}.` }, { property: "og:title", content: brandedTitle("Νέο άρθρο") }, { property: "og:description", content: `Δημιουργία νέου άρθρου στο frontend prototype του ${siteConfig.name}.` }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }) });

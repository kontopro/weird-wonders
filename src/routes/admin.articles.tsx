import { createFileRoute, Outlet } from "@tanstack/react-router";
import { brandedTitle, siteConfig } from "@/config/site";
export const Route = createFileRoute("/admin/articles")({ component: () => <Outlet />, head: () => ({ meta: [{ title: brandedTitle("Άρθρα") }, { name: "description", content: `Διαχείριση άρθρων του ${siteConfig.name}.` }, { property: "og:title", content: brandedTitle("Άρθρα") }, { property: "og:description", content: `Διαχείριση άρθρων του ${siteConfig.name}.` }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }) });

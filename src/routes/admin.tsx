import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";

export const Route = createFileRoute("/admin")({ component: AdminRoute, head: () => ({ meta: [{ title: "Διαχείριση — FACTάκι" }, { name: "description", content: "Frontend περιβάλλον σύνταξης του FACTάκι." }, { property: "og:title", content: "Διαχείριση — FACTάκι" }, { property: "og:description", content: "Frontend περιβάλλον σύνταξης του FACTάκι." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }) });

function AdminRoute() { return <AdminLayout><Outlet /></AdminLayout>; }
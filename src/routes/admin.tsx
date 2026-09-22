import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";
import { brandedTitle, siteConfig } from "@/config/site";

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
  head: () => ({
    meta: [
      { title: brandedTitle("Διαχείριση") },
      { name: "description", content: `Frontend περιβάλλον σύνταξης του ${siteConfig.name}.` },
      { property: "og:title", content: brandedTitle("Διαχείριση") },
      {
        property: "og:description",
        content: `Frontend περιβάλλον σύνταξης του ${siteConfig.name}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

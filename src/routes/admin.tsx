import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";
import { brandedTitle, siteConfig } from "@/config/site";
import { getAuthState } from "@/functions/auth";

export const Route = createFileRoute("/admin")({
  // Runs on the server for the first request and before every client navigation.
  // Server functions and RLS enforce access again; this guard only controls the UI.
  beforeLoad: async ({ location }) => {
    const auth = await getAuthState();
    if (auth.status !== "member") {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user: auth.user };
  },
  component: AdminRoute,
  head: () => ({
    meta: [
      { title: brandedTitle("Διαχείριση") },
      { name: "description", content: `Περιβάλλον σύνταξης του ${siteConfig.name}.` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminRoute() {
  const { user } = Route.useRouteContext();
  return (
    <AdminLayout user={user}>
      <Outlet />
    </AdminLayout>
  );
}

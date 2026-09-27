import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";
import { mainLanguage } from "@/config/site";
import { isSiteLanguage } from "@/i18n";

/**
 * Optional language prefix for every public page: no prefix for the main
 * language, `/en/…` (etc.) for the others. The URL words themselves are
 * translated by the router rewrite in `src/router.tsx`.
 */
export const Route = createFileRoute("/{-$lang}")({
  beforeLoad: ({ params, location }) => {
    const { lang } = params;
    if (lang === undefined) return;
    // The main language never has a prefix: /el/arthro/x → /arthro/x.
    if (lang === mainLanguage) {
      throw redirect({ href: location.href.slice(lang.length + 1) || "/", statusCode: 301 });
    }
    if (!isSiteLanguage(lang)) throw notFound();
  },
  component: Outlet,
});

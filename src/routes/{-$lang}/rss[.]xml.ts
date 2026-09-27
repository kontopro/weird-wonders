import { createFileRoute } from "@tanstack/react-router";
import { mainLanguage } from "@/config/site";
import { isSiteLanguage } from "@/i18n";
import { buildRss } from "@/server/feeds";

/** Latest articles of one language: /rss.xml (main language), /en/rss.xml, … */
export const Route = createFileRoute("/{-$lang}/rss.xml")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { lang } = params;
        // The main language has no prefix, like every other public page.
        if (lang === mainLanguage) {
          return new Response(null, { status: 301, headers: { location: "/rss.xml" } });
        }
        if (lang !== undefined && !isSiteLanguage(lang)) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(await buildRss(lang ?? mainLanguage), {
          headers: {
            "content-type": "application/rss+xml; charset=utf-8",
            "cache-control": "public, max-age=900",
          },
        });
      },
    },
  },
});

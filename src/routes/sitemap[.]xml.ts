import { createFileRoute } from "@tanstack/react-router";
import { buildSitemap } from "@/server/feeds";

/** Every public page in every language, with hreflang alternates. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await buildSitemap(), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});

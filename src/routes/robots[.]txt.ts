import { createFileRoute } from "@tanstack/react-router";
import { buildRobots } from "@/server/feeds";

/** Generated so the sitemap line always carries this deployment's address. */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildRobots(), {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=86400",
          },
        }),
    },
  },
});

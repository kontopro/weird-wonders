import { createFileRoute } from "@tanstack/react-router";
import { getDemoMediaFile } from "@/server/repositories";

/** Serves images uploaded in mock mode (kept in server memory). */
export const Route = createFileRoute("/media/demo/$id")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const file = getDemoMediaFile(params.id);
        if (!file) return new Response("Not found", { status: 404 });
        return new Response(file.bytes.slice().buffer, {
          headers: {
            "content-type": file.mimeType,
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});

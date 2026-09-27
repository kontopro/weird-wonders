import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toInternalPath, toPublicPath } from "@/i18n/paths";
import { routeTree } from "./routeTree.gen";

/** Applies a path translation to a URL, or returns undefined when nothing changes. */
const rewritePath =
  (translate: (pathname: string) => string | null) =>
  ({ url }: { url: URL }) => {
    const pathname = translate(url.pathname);
    if (pathname === null) return undefined;
    const next = new URL(url);
    next.pathname = pathname;
    return next;
  };

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Localized URL words: /en/article/x ↔ internal /en/arthro/x (see src/i18n/paths.ts).
    rewrite: { input: rewritePath(toInternalPath), output: rewritePath(toPublicPath) },
  });

  return router;
};

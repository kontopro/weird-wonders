import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { SiteShell } from "../components/site-shell";
import { Button } from "../components/ui/button";
import { Toaster } from "../components/ui/sonner";
import { siteConfig } from "../config/site";
import { mainMessages, useLang, useT } from "../i18n";
import { useLocalized } from "../i18n/links";

function NotFoundComponent() {
  const t = useT();
  const { lp } = useLocalized();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {t.common.notFoundTitle(siteConfig.name)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.common.notFoundText}</p>
        <div className="mt-6">
          <Link
            to="/{-$lang}"
            params={{ lang: lp }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.common.notFoundBack}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useT();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t.common.errorTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.common.errorText}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              void router.invalidate();
              reset();
            }}
          >
            {t.common.tryAgain}
          </Button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t.common.goHome}
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Runs before the first paint so dark mode does not flash light: the saved
 * choice wins, otherwise the system setting. The theme button updates both.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: siteConfig.name },
      // Fallbacks; public pages set their own description and social previews.
      { name: "description", content: mainMessages.site.seo.description },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [{ children: themeScript }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const lang = useLang();
  return (
    // The theme script may add the "dark" class before React hydrates.
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Browser toolbar colour, matching the light and dark page background.
            Written here because head() keeps only one meta per name. */}
        <meta name="theme-color" content="#f9f7f1" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#040d1c" media="(prefers-color-scheme: dark)" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Admin and login pages render without the public site header/footer.
  const isAdmin = useRouterState({
    select: ({ location }) =>
      location.pathname.startsWith("/admin") ||
      location.pathname === "/login" ||
      location.pathname.startsWith("/auth/"),
  });

  return (
    <QueryClientProvider client={queryClient}>
      {isAdmin ? (
        <Outlet />
      ) : (
        <SiteShell>
          <Outlet />
        </SiteShell>
      )}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

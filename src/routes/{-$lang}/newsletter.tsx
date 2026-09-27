import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { brandedTitle } from "@/config/site";
import { newsletterApi } from "@/data/newsletter";
import { messagesFor, useT } from "@/i18n";
import { langOf } from "@/i18n/head";
import { useLocalized } from "@/i18n/links";

/**
 * Landing page for newsletter links: `?action=confirm|unsubscribe&token=…`.
 * The links go into the e-mails once an e-mail provider is connected.
 */
export const Route = createFileRoute("/{-$lang}/newsletter")({
  validateSearch: z.object({
    action: z.enum(["confirm", "unsubscribe"]).optional().catch(undefined),
    token: z.string().max(100).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.action || !deps.token) return { outcome: "invalid" as const };
    const ok =
      deps.action === "confirm"
        ? await newsletterApi.confirm(deps.token)
        : await newsletterApi.unsubscribe(deps.token);
    return {
      outcome: ok ? (deps.action === "confirm" ? "confirmed" : "unsubscribed") : "invalid",
    } as const;
  },
  head: ({ params }) => ({
    meta: [
      { title: brandedTitle(messagesFor(langOf(params)).newsletter.title) },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewsletterPage,
});

function NewsletterPage() {
  const { outcome } = Route.useLoaderData();
  const t = useT();
  const { lp } = useLocalized();
  return (
    <div className="section-shell page-top">
      <div className="empty-state">
        <span>✉</span>
        <h1>{t.newsletter.title}</h1>
        <p role="status">{t.newsletter[outcome]}</p>
        <Link to="/{-$lang}" params={{ lang: lp }} className="link-button">
          {t.newsletter.backHome}
        </Link>
      </div>
    </div>
  );
}

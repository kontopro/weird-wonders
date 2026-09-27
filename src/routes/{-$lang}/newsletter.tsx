import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import { newsletterApi } from "@/data/newsletter";
import { messagesFor, useT } from "@/i18n";
import { langOf } from "@/i18n/head";
import { useLocalized } from "@/i18n/links";

/**
 * Landing page for the links in newsletter e-mails:
 * `?action=confirm|unsubscribe&token=…`. Opening the link only shows a button;
 * the change happens when the reader presses it. Mail security scanners open
 * links automatically, and must not confirm or unsubscribe anyone.
 */
export const Route = createFileRoute("/{-$lang}/newsletter")({
  validateSearch: z.object({
    action: z.enum(["confirm", "unsubscribe"]).optional().catch(undefined),
    token: z.string().max(100).optional().catch(undefined),
  }),
  head: ({ params }) => ({
    meta: [
      { title: brandedTitle(messagesFor(langOf(params)).newsletter.title) },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewsletterPage,
});

type Outcome = "confirmed" | "unsubscribed" | "invalid" | "failed";

function NewsletterPage() {
  const { action, token } = Route.useSearch();
  const t = useT();
  const { lp } = useLocalized();
  const [outcome, setOutcome] = useState<Outcome>();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!action || !token) return;
    setBusy(true);
    try {
      const ok =
        action === "confirm"
          ? await newsletterApi.confirm(token)
          : await newsletterApi.unsubscribe(token);
      setOutcome(ok ? (action === "confirm" ? "confirmed" : "unsubscribed") : "invalid");
    } catch {
      setOutcome("failed");
    } finally {
      setBusy(false);
    }
  };

  const valid = Boolean(action && token);
  return (
    <div className="section-shell page-top">
      <div className="empty-state">
        <span>✉</span>
        <h1>{t.newsletter.title}</h1>
        {outcome || !valid ? (
          <p role="status">{t.newsletter[outcome ?? "invalid"]}</p>
        ) : (
          <>
            <p>
              {action === "confirm" ? t.newsletter.confirmPrompt : t.newsletter.unsubscribePrompt}
            </p>
            <Button onClick={() => void run()} disabled={busy}>
              {action === "confirm" ? t.newsletter.confirmButton : t.newsletter.unsubscribeButton}
            </Button>
          </>
        )}
        <Link to="/{-$lang}" params={{ lang: lp }} className="link-button">
          {t.newsletter.backHome}
        </Link>
      </div>
    </div>
  );
}

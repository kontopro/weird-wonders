import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import { emailLinkTypes } from "@/data/auth/auth-provider";
import { verifyEmailLink } from "@/functions/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Landing page for links sent by e-mail (invitations, password resets).
 * The Supabase e-mail templates point here with `token_hash` and `type`; see
 * README. The link is used only when the person presses the button: mail
 * scanners open links on their own and would otherwise use it up, and a
 * link sent by someone else cannot sign a visitor in unnoticed.
 */
export const Route = createFileRoute("/auth/confirm")({
  validateSearch: z.object({
    token_hash: z.string().max(200).optional(),
    type: z.enum(emailLinkTypes).optional(),
    next: z.string().max(500).optional(),
  }),
  component: ConfirmEmailLink,
  head: () => ({
    meta: [
      { title: brandedTitle("Επιβεβαίωση") },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const intro = {
  invite: "Σε προσκάλεσαν στη συντακτική ομάδα. Συνέχισε για να ορίσεις κωδικό.",
  recovery: "Συνέχισε για να ορίσεις νέο κωδικό.",
} as const;

function ConfirmEmailLink() {
  const { token_hash: tokenHash, type, next } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState(tokenHash && type ? "" : "Ο σύνδεσμος δεν είναι πλήρης.");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!tokenHash || !type) return;
    setBusy(true);
    try {
      const result = await verifyEmailLink({ data: { tokenHash, type } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await navigate({ href: safeRedirectPath(next, "/admin/password") });
    } catch {
      setError("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="admin-panel login-card">
        <BrandLogo />
        {error ? (
          <>
            <h1>Ο σύνδεσμος δεν λειτούργησε</h1>
            <p className="login-note" role="alert">
              {error}
            </p>
            <Link to="/login" className="link-button">
              Μετάβαση στη σύνδεση
            </Link>
          </>
        ) : (
          <>
            <h1>Επιβεβαίωση</h1>
            <p className="login-note">{type ? intro[type] : ""}</p>
            <Button onClick={() => void confirm()} disabled={busy}>
              Συνέχεια
            </Button>
          </>
        )}
      </section>
    </main>
  );
}

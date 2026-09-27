import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
import { brandedTitle } from "@/config/site";
import { emailLinkTypes } from "@/data/auth/auth-provider";
import { verifyEmailLink } from "@/functions/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Landing page for links sent by e-mail (invitations, password resets).
 * The Supabase e-mail templates point here with `token_hash` and `type`; see README.
 */
export const Route = createFileRoute("/auth/confirm")({
  validateSearch: z.object({
    token_hash: z.string().optional(),
    type: z.enum(emailLinkTypes).optional(),
    next: z.string().optional(),
  }),
  beforeLoad: async ({ search }) => {
    if (!search.token_hash || !search.type) {
      return { error: "Ο σύνδεσμος δεν είναι πλήρης." };
    }
    const result = await verifyEmailLink({
      data: { tokenHash: search.token_hash, type: search.type },
    });
    if (!result.ok) return { error: result.message };
    throw redirect({ href: safeRedirectPath(search.next, "/admin/password") });
  },
  component: ConfirmFailed,
  head: () => ({
    meta: [
      { title: brandedTitle("Επιβεβαίωση") },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function ConfirmFailed() {
  const { error } = Route.useRouteContext();
  return (
    <main className="login-page">
      <section className="admin-panel login-card">
        <BrandLogo />
        <h1>Ο σύνδεσμος δεν λειτούργησε</h1>
        <p className="login-note" role="alert">
          {error}
        </p>
        <Link to="/login" className="link-button">
          Μετάβαση στη σύνδεση
        </Link>
      </section>
    </main>
  );
}

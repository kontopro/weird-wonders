import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import { newsletterApi } from "@/data/newsletter";
import { subscriberStatusLabels, subscribersToCsv, type Subscriber } from "@/domain/newsletter";
import { canManageTeam } from "@/domain/team";
import { messagesFor } from "@/i18n";
import { errorMessage } from "@/lib/error-message";

export const Route = createFileRoute("/admin/subscribers")({
  // Subscribers are personal data: owners and admins only.
  beforeLoad: ({ context }) => {
    if (!canManageTeam(context.user.role)) throw redirect({ to: "/admin" });
  },
  loader: async () => {
    const [subscribers, outbox, provider] = await Promise.all([
      newsletterApi.list(),
      newsletterApi.demoOutbox(),
      newsletterApi.emailProvider(),
    ]);
    return { subscribers, outbox, provider };
  },
  component: SubscribersAdmin,
  head: () => ({ meta: [{ title: brandedTitle("Newsletter") }] }),
});

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("el-GR", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "—";

/**
 * Demo links point to the configured site address; open them on this server
 * instead, so they work on localhost and previews.
 */
const demoLink = (url: string) => {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
};

function SubscribersAdmin() {
  const { subscribers, outbox, provider } = Route.useLoaderData();
  const router = useRouter();
  const [removing, setRemoving] = useState<Subscriber>();
  const active = subscribers.filter((item) => item.status !== "unsubscribed");

  const exportCsv = () => {
    const blob = new Blob([subscribersToCsv(subscribers)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-overline">Κοινό</p>
          <h1>Newsletter</h1>
          <p>
            {active.length} ενεργές εγγραφές από {subscribers.length}.{" "}
            {provider
              ? `Τα email επιβεβαίωσης στέλνονται αυτόματα (${provider}).`
              : "Δεν έχει οριστεί πάροχος email (RESEND_API_KEY, EMAIL_FROM): τα email επιβεβαίωσης δεν στέλνονται."}
          </p>
        </div>
        <Button onClick={exportCsv} disabled={subscribers.length === 0}>
          <Download /> Εξαγωγή CSV
        </Button>
      </header>

      <section className="admin-panel subscriber-list">
        {subscribers.length === 0 && (
          <p className="admin-empty-note">Καμία εγγραφή ακόμα. Η φόρμα είναι στην αρχική σελίδα.</p>
        )}
        {subscribers.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Γλώσσα</th>
                <th>Κατάσταση</th>
                <th>Συγκατάθεση</th>
                <th>
                  <span className="sr-only">Ενέργειες</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td>{subscriber.email}</td>
                  <td>{messagesFor(subscriber.language).languageName}</td>
                  <td>{subscriberStatusLabels[subscriber.status]}</td>
                  <td>{formatDateTime(subscriber.consentAt)}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRemoving(subscriber)}
                      aria-label={`Διαγραφή: ${subscriber.email}`}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {outbox.length > 0 && (
        <section className="admin-panel demo-outbox" aria-label="Demo email">
          <h2>Demo: email που θα είχαν σταλεί</h2>
          <p className="admin-empty-note">
            Στη demo λειτουργία τα email δεν φεύγουν· εμφανίζονται εδώ για να δοκιμάσεις τους
            συνδέσμους τους.
          </p>
          {outbox.map((message) => (
            <details key={message.id}>
              <summary>
                <strong>{message.subject}</strong> → {message.to} · {formatDateTime(message.sentAt)}
              </summary>
              <pre>
                {message.text.split(/(https?:\/\/\S+)/).map((part, index) =>
                  /^https?:\/\//.test(part) ? (
                    <a key={index} href={demoLink(part)}>
                      {part}
                    </a>
                  ) : (
                    part
                  ),
                )}
              </pre>
            </details>
          ))}
        </section>
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={`Οριστική διαγραφή του ${removing?.email ?? ""};`}
        description="Για αιτήματα διαγραφής δεδομένων. Αν ο συνδρομητής απλώς δεν θέλει μηνύματα, αρκεί η απεγγραφή από τον σύνδεσμο του email."
        confirmLabel="Διαγραφή"
        onConfirm={() => {
          const target = removing;
          setRemoving(undefined);
          if (!target) return;
          newsletterApi
            .remove(target.id)
            .then(() => {
              toast.success("Η εγγραφή διαγράφηκε.");
              return router.invalidate();
            })
            .catch((error: unknown) => toast.error(errorMessage(error)));
        }}
      />
    </div>
  );
}

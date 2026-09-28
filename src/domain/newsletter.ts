import { z } from "zod";

export const subscriberStatuses = ["pending", "confirmed", "unsubscribed"] as const;
export type SubscriberStatus = (typeof subscriberStatuses)[number];

export const subscriberStatusLabels: Record<SubscriberStatus, string> = {
  pending: "Εκκρεμεί επιβεβαίωση",
  confirmed: "Επιβεβαιωμένος",
  unsubscribed: "Διαγράφηκε",
};

export type Subscriber = {
  id: string;
  email: string;
  language: string;
  status: SubscriberStatus;
  consentAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
};

export const subscribeInputSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(320),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  })
  .strict();
export type SubscribeInput = z.infer<typeof subscribeInputSchema>;

/**
 * Demo mode accepts only example addresses, so a public demo never collects
 * real e-mail addresses (its admin is open to everyone).
 */
export const isDemoEmail = (email: string) => /@example\.(com|org|net)$/i.test(email.trim());

/** At most one confirmation e-mail per address in this many minutes. */
export const confirmationIntervalMinutes = 10;
/** At most this many confirmation e-mails in any hour (protects the e-mail quota). */
export const confirmationHourlyLimit = 100;

/** What the server needs to e-mail a confirmation link. Never sent to browsers. */
export type ConfirmationTicket = { token: string; language: string };

/** CSV for exporting the list (e.g. to an e-mail provider). */
export function subscribersToCsv(subscribers: readonly Subscriber[]): string {
  const escape = (value: string | null) => `"${(value ?? "").replaceAll('"', '""')}"`;
  const header = "email,language,status,consent_at,confirmed_at,unsubscribed_at";
  const rows = subscribers.map((item) =>
    [item.email, item.language, item.status, item.consentAt, item.confirmedAt, item.unsubscribedAt]
      .map(escape)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

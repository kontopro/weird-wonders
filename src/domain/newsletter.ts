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

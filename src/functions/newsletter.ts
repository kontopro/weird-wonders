import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { subscribeInputSchema, type SubscribeInput } from "@/domain/newsletter";
import { requireMember } from "@/server/auth";
import { DomainError } from "@/domain/errors";
import { allow } from "@/server/rate-limit";
import { getDemoOutbox, getEmailSender, getRepositories } from "@/server/repositories";
import { sendNewsletterConfirmation } from "@/server/newsletter-email";

const tokenSchema = z.string().trim().min(1).max(100);
/** Subscribers are personal data: owners and admins only. */
const listManagers = ["owner", "admin"] as const;

/** Public sign-up; always answers the same way. */
export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .validator((input: SubscribeInput) => subscribeInputSchema.parse(input))
  .handler(async ({ data }) => {
    if (!allow("subscribe"))
      throw new DomainError("Too many sign-ups. Try again later.", "invalid");
    await getRepositories().newsletter.subscribe(data);
    // Double opt-in: the address counts only after the link in this e-mail.
    await sendNewsletterConfirmation(data.email);
  });

export const confirmNewsletter = createServerFn({ method: "POST" })
  .validator((token: string) => tokenSchema.parse(token))
  .handler(({ data }) => {
    if (!allow("newsletterLink")) throw new DomainError("Too many attempts.", "invalid");
    return getRepositories().newsletter.confirm(data);
  });

export const unsubscribeNewsletter = createServerFn({ method: "POST" })
  .validator((token: string) => tokenSchema.parse(token))
  .handler(({ data }) => {
    if (!allow("newsletterLink")) throw new DomainError("Too many attempts.", "invalid");
    return getRepositories().newsletter.unsubscribe(data);
  });

export const listSubscribers = createServerFn({ method: "GET" }).handler(async () => {
  await requireMember(listManagers);
  return getRepositories().newsletter.list();
});

export const removeSubscriber = createServerFn({ method: "POST" })
  .validator((id: string) => z.string().min(1).max(100).parse(id))
  .handler(async ({ data }) => {
    await requireMember(listManagers);
    await getRepositories().newsletter.remove(data);
  });

/** E-mails "sent" in demo mode, so their links can be opened (owners/admins). */
export const listDemoOutbox = createServerFn({ method: "GET" }).handler(async () => {
  await requireMember(listManagers);
  return getDemoOutbox().map(({ id, to, subject, text, sentAt }) => ({
    id,
    to,
    subject,
    text,
    sentAt,
  }));
});

/** Which e-mail provider is active (null: none, e-mails are not sent). */
export const getEmailProvider = createServerFn({ method: "GET" }).handler(async () => {
  await requireMember(listManagers);
  return getEmailSender()?.name ?? null;
});

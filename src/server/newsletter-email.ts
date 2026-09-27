import { newsletterConfirmationEmail } from "@/emails/newsletter-confirmation";
import { getEmailSender, getRepositories } from "@/server/repositories";

export type ConfirmationResult = "sent" | "skipped" | "disabled" | "failed";

/**
 * After a sign-up: e-mails the confirmation link when the address is pending
 * and has not had one recently. Never throws and never tells the visitor what
 * happened, so the form cannot reveal who is subscribed.
 */
export async function sendNewsletterConfirmation(email: string): Promise<ConfirmationResult> {
  const sender = getEmailSender();
  if (!sender) {
    console.warn("[newsletter] No e-mail provider configured: confirmation not sent.");
    return "disabled";
  }
  try {
    const ticket = await getRepositories().newsletter.claimConfirmation(email);
    if (!ticket) return "skipped";
    await sender.send(newsletterConfirmationEmail({ to: email, ...ticket }));
    return "sent";
  } catch (error) {
    // Logged without the address or token.
    console.error(`[newsletter] Confirmation e-mail via ${sender.name} failed:`, error);
    return "failed";
  }
}

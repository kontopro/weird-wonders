import type { EmailMessage } from "@/domain/email";

/**
 * Delivers e-mails. Adapters: Resend (production), an in-memory outbox (demo
 * mode). Add another provider by implementing this one method.
 */
export interface EmailSender {
  /** Human-readable name, for logs and the admin. */
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

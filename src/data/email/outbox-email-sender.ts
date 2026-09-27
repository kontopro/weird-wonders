import type { EmailSender } from "@/data/email/email-sender";
import type { MockStore } from "@/data/mock/mock-store";
import type { EmailMessage } from "@/domain/email";

/** Most recent demo e-mails kept in memory. */
export const outboxSize = 20;

/**
 * Demo mode: e-mails are not sent but kept in memory, newest first, so the
 * admin can open their links (`/admin/subscribers`).
 */
export class OutboxEmailSender implements EmailSender {
  readonly name = "Demo outbox";

  constructor(private readonly store: MockStore) {}

  async send(message: EmailMessage) {
    this.store.outbox.unshift({
      ...message,
      id: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
    });
    this.store.outbox.length = Math.min(this.store.outbox.length, outboxSize);
  }
}

import type { EmailSender } from "@/data/email/email-sender";
import type { EmailMessage } from "@/domain/email";

/**
 * Sends through Resend's HTTP API (https://resend.com/docs/api-reference).
 * Needs `RESEND_API_KEY` and a verified sender domain for `EMAIL_FROM`
 * (e.g. `FACTάκι <newsletter@factaki.gr>`). Server-only.
 */
export class ResendEmailSender implements EmailSender {
  readonly name = "Resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage) {
    const response = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.headers ? { headers: message.headers } : {}),
      }),
    });
    if (!response.ok) {
      // Resend answers with { name, message }; never include the API key.
      const detail = await response.text().catch(() => "");
      throw new Error(`Resend: ${response.status} ${detail.slice(0, 300)}`);
    }
  }
}

/** An e-mail as the app composes it; each sender adapter delivers it. */
export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain-text version (always sent, for clients that do not show HTML). */
  text: string;
  html: string;
  /** Extra headers, e.g. `List-Unsubscribe`. */
  headers?: Record<string, string>;
};

/** Escapes text for HTML e-mail bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

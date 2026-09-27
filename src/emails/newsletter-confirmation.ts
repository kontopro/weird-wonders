import { siteConfig } from "@/config/site";
import { escapeHtml, type EmailMessage } from "@/domain/email";
import { absoluteUrl, localizedPath, messagesFor } from "@/i18n";

/** Link of the newsletter page that confirms or unsubscribes by token. */
export function newsletterActionUrl(
  language: string,
  action: "confirm" | "unsubscribe",
  token: string,
): string {
  const params = new URLSearchParams({ action, token });
  return `${absoluteUrl(localizedPath(language, "/newsletter"))}?${params}`;
}

/** Double opt-in e-mail, in the language the reader signed up in. */
export function newsletterConfirmationEmail(input: {
  to: string;
  language: string;
  token: string;
}): EmailMessage {
  const t = messagesFor(input.language);
  const name = siteConfig.name;
  const confirmUrl = newsletterActionUrl(input.language, "confirm", input.token);
  const unsubscribeUrl = newsletterActionUrl(input.language, "unsubscribe", input.token);
  const subject = t.email.confirmSubject(name);

  const text = [
    t.email.confirmHeading,
    "",
    t.email.confirmIntro(name),
    "",
    `${t.email.confirmButton}: ${confirmUrl}`,
    "",
    t.email.ignore,
    "",
    `— ${name} · ${absoluteUrl(localizedPath(input.language, "/"))}`,
  ].join("\n");

  const e = escapeHtml;
  const html = `<!doctype html>
<html lang="${e(input.language)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(subject)}</title></head>
<body style="margin:0;padding:24px;background:#f9f7f1;font-family:Arial,Helvetica,sans-serif;color:#051a36">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px">
    <tr><td style="padding:32px">
      <p style="margin:0 0 24px;font-size:20px;font-weight:bold">${e(name)}</p>
      <h1 style="margin:0 0 12px;font-size:24px">${e(t.email.confirmHeading)}</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.5">${e(t.email.confirmIntro(name))}</p>
      <p style="margin:0 0 24px"><a href="${e(confirmUrl)}" style="display:inline-block;padding:12px 20px;background:#051a36;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">${e(t.email.confirmButton)}</a></p>
      <p style="margin:0 0 8px;font-size:13px;color:#5b6475">${e(t.email.linkFallback)}</p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${e(confirmUrl)}" style="color:#051a36">${e(confirmUrl)}</a></p>
      <p style="margin:0;font-size:13px;color:#5b6475">${e(t.email.ignore)}</p>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    to: input.to,
    subject,
    text,
    html,
    // Mail apps show an "unsubscribe" option next to the sender.
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
    },
  };
}

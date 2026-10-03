# Domain, e-mail and hand-over

FACTάκι is a gift. Until the reveal, every account is in the developer's name and nothing may e-mail the future owner. This page lists where each address lives, so any of them can change later without touching code, and the steps to hand the site over.

## Rules until the reveal

- Use the developer's e-mail everywhere: registrar, Vercel, Supabase, Resend, the site's owner account.
- Do not invite the future owner to the admin, Vercel, Supabase or Resend (each sends her an e-mail).
- Turn on auto-renew for the domain, so it cannot expire before the hand-over.

## Where each address lives

No e-mail address is written in the code. Each one is a setting:

| What                                         | Where to change it                                                                              | Example                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| Sender of the site's e-mails                 | Vercel → Settings → Environment Variables → `EMAIL_FROM`, then redeploy                         | `FACTάκι <newsletter@factaki.gr>`     |
| Where readers' answers go                    | Vercel → `EMAIL_REPLY_TO` (comma-separated), then redeploy                                      | `hello@factaki.gr`                    |
| Sender of invites, magic links and passwords | Supabase → Authentication → Emails → SMTP Settings (sender e-mail and name)                     | `FACTάκι <noreply@factaki.gr>`        |
| `hello@factaki.gr` delivery                  | E-mail forwarding (ImprovMX or the registrar's forwarding): one rule, `hello` → a Gmail address | → the owner's Gmail                   |
| Sending as `hello@factaki.gr` from Gmail     | Gmail → Settings → Accounts → Send mail as (in the owner's Gmail, done by her)                  | SMTP `smtp.resend.com`, user `resend` |
| Domain owner (registrant)                    | The registrar's transfer-of-ownership form (μεταβίβαση)                                         | the owner's name and e-mail           |
| Account e-mails                              | Each service's account settings                                                                 | Vercel, Supabase, Resend, registrar   |
| Site sign-in                                 | The person's own account in `/admin/team` (each person signs in with their own e-mail)          |                                       |

So a new address means: change the setting, redeploy if it is a Vercel variable, and send one test e-mail.

## Phase 1: now (developer's name)

1. Register `factaki.gr` (optionally also `φακτάκι.gr`, redirected to the main domain) with a Greek registrar. Auto-renew on.
2. Vercel: add the domain to the project, add the DNS records it shows at the registrar, set `VITE_SITE_URL=https://factaki.gr`.
3. Resend: add the domain, add its DNS records (SPF, DKIM, the MX of the sending subdomain), add a DMARC record, wait for "Verified".
4. Vercel: set `RESEND_API_KEY`, `EMAIL_FROM` and, if wanted, `EMAIL_REPLY_TO` (for now the developer's address). Redeploy.
5. Supabase: Authentication → Emails → SMTP Settings, using Resend's SMTP (`smtp.resend.com`, port 465, user `resend`, password = a Resend API key). Raise the e-mail rate limit under Authentication → Rate Limits if invites are throttled.
6. Test: a newsletter sign-up, an invite to a test address, a password reset.

## Phase 2: the hand-over (after the reveal)

1. **Domain:** transfer ownership to her name through the registrar's form (both sign; there may be a fee). Keep the developer as technical contact if she agrees. Move auto-renew to her card.
2. **Mailbox:** create `hello@factaki.gr` forwarding to her Gmail. In her Gmail, add it under "Send mail as" (Resend SMTP, as above); Gmail e-mails her a code to confirm. Do this together on a call; she never shares her password.
3. **Site e-mails:** set `EMAIL_REPLY_TO=hello@factaki.gr` on Vercel and redeploy. Send a test sign-up and answer it.
4. **Site account:** invite her at `/admin/team`, have her set her password, make her the owner, then set the developer's role to whatever both prefer (admin, or remove).
5. **Services:** invite her to the Vercel project, the Supabase organisation and the Resend team, or transfer them to her. Change billing e-mails and cards where needed.
6. **Clean up:** remove any test users, check every account's recovery e-mail and two-factor settings, and update this page.

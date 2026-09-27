import { describe, expect, test } from "bun:test";
import { newsletterActionUrl, newsletterConfirmationEmail } from "@/emails/newsletter-confirmation";

const token = "0b8f3c8e-1d2a-4c5b-9e6f-7a8b9c0d1e2f";

describe("newsletter confirmation e-mail", () => {
  test("links to the newsletter page in the reader's language", () => {
    expect(newsletterActionUrl("el", "confirm", token)).toBe(
      `https://factaki.gr/newsletter?action=confirm&token=${token}`,
    );
    expect(newsletterActionUrl("en", "unsubscribe", token)).toBe(
      `https://factaki.gr/en/newsletter?action=unsubscribe&token=${token}`,
    );
  });

  test("Greek e-mail with the confirm link in text and HTML, and an unsubscribe header", () => {
    const email = newsletterConfirmationEmail({ to: "a@example.com", language: "el", token });
    expect(email.to).toBe("a@example.com");
    expect(email.subject).toContain("Επιβεβαίωσε");
    expect(email.text).toContain(`/newsletter?action=confirm&token=${token}`);
    expect(email.html).toContain(
      `href="https://factaki.gr/newsletter?action=confirm&amp;token=${token}"`,
    );
    expect(email.html).toContain('<html lang="el">');
    expect(email.headers?.["List-Unsubscribe"]).toBe(
      `<https://factaki.gr/newsletter?action=unsubscribe&token=${token}>`,
    );
  });

  test("English sign-ups get English e-mails", () => {
    const email = newsletterConfirmationEmail({ to: "a@example.com", language: "en", token });
    expect(email.subject).toBe("Confirm your subscription to FACTάκι");
    expect(email.text).toContain("/en/newsletter?action=confirm");
  });
});

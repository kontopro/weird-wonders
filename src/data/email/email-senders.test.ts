import { describe, expect, test } from "bun:test";
import { OutboxEmailSender, outboxSize } from "@/data/email/outbox-email-sender";
import { ResendEmailSender } from "@/data/email/resend-email-sender";
import { createDemoStore } from "@/data/mock/demo-seed";
import { MockNewsletterRepository } from "@/data/mock/mock-newsletter-repository";

const message = { to: "a@example.com", subject: "Θέμα", text: "Κείμενο", html: "<p>Κείμενο</p>" };

describe("ResendEmailSender", () => {
  test("posts the message to Resend with the API key", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: "1" }), { status: 200 });
    }) as unknown as typeof fetch;
    await new ResendEmailSender("re_test", "Blog <news@example.com>", fakeFetch).send({
      ...message,
      headers: { "List-Unsubscribe": "<https://example.com/u>" },
    });
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    expect(new Headers(calls[0]!.init.headers).get("authorization")).toBe("Bearer re_test");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      from: "Blog <news@example.com>",
      to: ["a@example.com"],
      subject: "Θέμα",
      text: "Κείμενο",
      html: "<p>Κείμενο</p>",
      headers: { "List-Unsubscribe": "<https://example.com/u>" },
    });
  });

  test("fails loudly on an error answer, without echoing the key", async () => {
    const fakeFetch = (async () =>
      new Response('{"message":"domain not verified"}', {
        status: 403,
      })) as unknown as typeof fetch;
    const sending = new ResendEmailSender("re_secret", "x@example.com", fakeFetch).send(message);
    await expect(sending).rejects.toThrow("Resend: 403");
    await expect(sending).rejects.not.toThrow("re_secret");
  });
});

describe("demo outbox and confirmation claims", () => {
  test("keeps the newest e-mails only", async () => {
    const store = createDemoStore();
    const outbox = new OutboxEmailSender(store);
    for (let index = 0; index < outboxSize + 5; index += 1) {
      await outbox.send({ ...message, subject: `#${index}` });
    }
    expect(store.outbox).toHaveLength(outboxSize);
    expect(store.outbox[0]!.subject).toBe(`#${outboxSize + 4}`);
  });

  test("one confirmation per pending address per interval; none once confirmed", async () => {
    const store = createDemoStore();
    const newsletter = new MockNewsletterRepository(store);
    await newsletter.subscribe({ email: "reader@example.com", language: "en" });

    const ticket = await newsletter.claimConfirmation("Reader@example.com");
    expect(ticket).toEqual({ token: expect.any(String), language: "en" });
    expect(await newsletter.claimConfirmation("reader@example.com")).toBeNull();

    store.subscribers[0]!.confirmationSentAt = new Date(Date.now() - 11 * 60_000).toISOString();
    expect(await newsletter.claimConfirmation("reader@example.com")).not.toBeNull();

    await newsletter.confirm(ticket!.token);
    store.subscribers[0]!.confirmationSentAt = null;
    expect(await newsletter.claimConfirmation("reader@example.com")).toBeNull();
    expect(await newsletter.claimConfirmation("nobody@example.com")).toBeNull();
  });
});

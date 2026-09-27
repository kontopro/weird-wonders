import type { MockStore } from "@/data/mock/mock-store";
import type { NewsletterRepository } from "@/data/newsletter/newsletter-repository";
import {
  confirmationHourlyLimit,
  confirmationIntervalMinutes,
  type SubscribeInput,
} from "@/domain/newsletter";

/** In-memory newsletter list with the database's rules (idempotent, silent). */
export class MockNewsletterRepository implements NewsletterRepository {
  constructor(private readonly store: MockStore) {}

  async subscribe({ email, language }: SubscribeInput) {
    const existing = this.store.subscribers.find((item) => item.email === email);
    const now = new Date().toISOString();
    if (existing) {
      existing.language = language;
      existing.consentAt = now;
      if (existing.status === "unsubscribed") existing.status = "pending";
      existing.unsubscribedAt = null;
      return;
    }
    this.store.subscribers.push({
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      email,
      language,
      status: "pending",
      consentAt: now,
      confirmedAt: null,
      unsubscribedAt: null,
    });
  }

  async claimConfirmation(email: string) {
    const subscriber = this.store.subscribers.find(
      (item) => item.email === email.trim().toLowerCase(),
    );
    if (!subscriber || subscriber.status !== "pending") return null;
    const last = subscriber.confirmationSentAt ? Date.parse(subscriber.confirmationSentAt) : 0;
    if (Date.now() - last < confirmationIntervalMinutes * 60_000) return null;
    const hourAgo = Date.now() - 60 * 60_000;
    const sentLastHour = this.store.subscribers.filter(
      (item) => item.confirmationSentAt && Date.parse(item.confirmationSentAt) > hourAgo,
    ).length;
    if (sentLastHour >= confirmationHourlyLimit) return null;
    subscriber.confirmationSentAt = new Date().toISOString();
    return { token: subscriber.token, language: subscriber.language };
  }

  private byToken(token: string) {
    return this.store.subscribers.find((item) => item.token === token);
  }

  async confirm(token: string) {
    const subscriber = this.byToken(token);
    if (!subscriber || subscriber.status === "unsubscribed") return false;
    subscriber.status = "confirmed";
    subscriber.confirmedAt ??= new Date().toISOString();
    return true;
  }

  async unsubscribe(token: string) {
    const subscriber = this.byToken(token);
    if (!subscriber) return false;
    subscriber.status = "unsubscribed";
    subscriber.unsubscribedAt = new Date().toISOString();
    return true;
  }

  async list() {
    return [...this.store.subscribers]
      .sort((a, b) => b.consentAt.localeCompare(a.consentAt))
      .map(({ token: _token, confirmationSentAt: _sent, ...subscriber }) => subscriber);
  }

  async remove(id: string) {
    this.store.subscribers = this.store.subscribers.filter((item) => item.id !== id);
  }
}

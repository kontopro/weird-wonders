import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { NewsletterRepository } from "@/data/newsletter/newsletter-repository";
import { toDomainError } from "@/data/supabase/supabase-errors";
import { subscriberStatuses, type SubscribeInput } from "@/domain/newsletter";

const rowSchema = z.object({
  id: z.string(),
  email: z.string(),
  language: z.string(),
  status: z.enum(subscriberStatuses),
  consent_at: z.string(),
  confirmed_at: z.string().nullable(),
  unsubscribed_at: z.string().nullable(),
});

const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

/** Newsletter via the database functions in `20260927170008_reader_features.sql`. */
export class SupabaseNewsletterRepository implements NewsletterRepository {
  constructor(private readonly client: SupabaseClient) {}

  async subscribe({ email, language }: SubscribeInput) {
    const { error } = await this.client.rpc("subscribe_newsletter", {
      p_email: email,
      p_language: language,
    });
    if (error) throw toDomainError(error, "");
  }

  private async byToken(fn: "confirm_newsletter" | "unsubscribe_newsletter", token: string) {
    if (!isUuid(token)) return false;
    const { data, error } = await this.client.rpc(fn, { p_token: token });
    if (error) throw toDomainError(error, "");
    return data === true;
  }

  confirm(token: string) {
    return this.byToken("confirm_newsletter", token);
  }

  unsubscribe(token: string) {
    return this.byToken("unsubscribe_newsletter", token);
  }

  async list() {
    const { data, error } = await this.client
      .from("newsletter_subscribers")
      .select("id, email, language, status, consent_at, confirmed_at, unsubscribed_at")
      .order("consent_at", { ascending: false });
    if (error) throw toDomainError(error, "");
    return z
      .array(rowSchema)
      .parse(data ?? [])
      .map((row) => ({
        id: row.id,
        email: row.email,
        language: row.language,
        status: row.status,
        consentAt: row.consent_at,
        confirmedAt: row.confirmed_at,
        unsubscribedAt: row.unsubscribed_at,
      }));
  }

  async remove(id: string) {
    const { error } = await this.client.from("newsletter_subscribers").delete().eq("id", id);
    if (error) throw toDomainError(error, "");
  }
}

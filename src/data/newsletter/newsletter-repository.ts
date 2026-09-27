import type { SubscribeInput, Subscriber } from "@/domain/newsletter";

export interface NewsletterRepository {
  /** Idempotent and silent: never reveals whether the address was already there. */
  subscribe(input: SubscribeInput): Promise<void>;
  /** Returns false when the token is unknown. */
  confirm(token: string): Promise<boolean>;
  unsubscribe(token: string): Promise<boolean>;
  /** Owners and admins only (personal data). */
  list(): Promise<Subscriber[]>;
  /** Erases a subscriber (e.g. a GDPR request). */
  remove(id: string): Promise<void>;
}

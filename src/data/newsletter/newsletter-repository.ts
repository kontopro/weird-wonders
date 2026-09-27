import type { ConfirmationTicket, SubscribeInput, Subscriber } from "@/domain/newsletter";

export interface NewsletterRepository {
  /** Idempotent and silent: never reveals whether the address was already there. */
  subscribe(input: SubscribeInput): Promise<void>;
  /**
   * Server only: the token for a confirmation e-mail to a pending address,
   * or null when it is not pending, had one in the last
   * `confirmationIntervalMinutes`, or the server may not read tokens.
   */
  claimConfirmation(email: string): Promise<ConfirmationTicket | null>;
  /** Returns false when the token is unknown. */
  confirm(token: string): Promise<boolean>;
  unsubscribe(token: string): Promise<boolean>;
  /** Owners and admins only (personal data). */
  list(): Promise<Subscriber[]>;
  /** Erases a subscriber (e.g. a GDPR request). */
  remove(id: string): Promise<void>;
}

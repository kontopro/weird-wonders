import type { AuthState, MemberRole } from "@/lib/auth-types";

/** How the login page should let people sign in with the active provider. */
export type LoginOptions =
  | { method: "password" }
  | {
      method: "demo";
      accounts: Array<{ id: string; displayName: string; role: MemberRole }>;
    }
  | { method: "disabled"; reason: string };

export type SignInInput =
  { method: "password"; email: string; password: string } | { method: "demo"; userId: string };

export type SignInResult = { ok: true } | { ok: false; message: string };

/** Links sent by e-mail: an invitation or a password reset. */
export const emailLinkTypes = ["invite", "recovery"] as const;
export type EmailLinkInput = { tokenHash: string; type: (typeof emailLinkTypes)[number] };

/**
 * Authentication contract. The app depends only on this interface; the adapter
 * (demo accounts, Supabase Auth, …) is chosen in `src/server/repositories.ts`.
 * Implementations are created per request and must not share session state.
 */
export interface AuthProvider {
  getAuthState(): Promise<AuthState>;
  getLoginOptions(): LoginOptions;
  signIn(input: SignInInput): Promise<SignInResult>;
  signOut(): Promise<void>;
  /** Signs the visitor in from an e-mailed link (invitation, password reset). */
  verifyEmailLink(input: EmailLinkInput): Promise<SignInResult>;
  /** Sets a new password for the signed-in visitor. */
  updatePassword(password: string): Promise<SignInResult>;
}

/** Minimal cookie access so adapters stay independent of the web framework. */
export interface SessionCookie {
  get(): string | undefined;
  set(value: string): void;
  clear(): void;
}

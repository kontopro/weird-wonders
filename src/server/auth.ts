import type { AuthState, MemberRole, SessionUser } from "@/lib/auth-types";
import { getAuthProvider } from "@/server/repositories";

export class AuthorizationError extends Error {
  constructor(message = "Δεν έχεις πρόσβαση σε αυτή την ενέργεια.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Resolves the visitor of the current request. Server-only. */
export function resolveAuthState(): Promise<AuthState> {
  return getAuthProvider().getAuthState();
}

/**
 * Guards server functions. With a real database, its access rules (e.g. RLS)
 * remain the final security boundary; this check fails early with a clear error.
 */
export async function requireMember(allowedRoles?: readonly MemberRole[]): Promise<SessionUser> {
  const state = await resolveAuthState();
  if (state.status !== "member") throw new AuthorizationError("Απαιτείται σύνδεση.");
  if (allowedRoles && !allowedRoles.includes(state.user.role)) throw new AuthorizationError();
  return state.user;
}

import { z } from "zod";
import { getDataSource, isDemoAdminEnabled } from "@/lib/data-source";
import { memberRoles, type AuthState, type MemberRole, type SessionUser } from "@/lib/auth-types";
import { createSupabaseServerClient } from "@/server/supabase";

const demoUser: SessionUser = {
  id: "00000000-0000-4000-8000-000000000000",
  email: null,
  displayName: "Demo διαχειριστής",
  role: "owner",
  isDemo: true,
};

const memberRowSchema = z.object({
  role: z.enum(memberRoles),
  status: z.enum(["active", "suspended"]),
  profile: z.object({ display_name: z.string() }).nullable(),
});

export class AuthorizationError extends Error {
  constructor(message = "Δεν έχεις πρόσβαση σε αυτή την ενέργεια.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Resolves the visitor of the current request. Server-only. */
export async function resolveAuthState(): Promise<AuthState> {
  if (getDataSource() === "mock") {
    return isDemoAdminEnabled() ? { status: "member", user: demoUser } : { status: "anonymous" };
  }

  const supabase = createSupabaseServerClient();
  // getClaims() verifies the JWT signature; never trust getSession() on the server.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) return { status: "anonymous" };

  const email = typeof claims.email === "string" ? claims.email : null;
  const { data, error } = await supabase
    .from("members")
    .select("role, status, profile:profiles(display_name)")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (error) throw error;

  const member = data ? memberRowSchema.safeParse(data) : null;
  if (!member?.success || member.data.status !== "active") {
    return { status: "not_member", email };
  }

  return {
    status: "member",
    user: {
      id: claims.sub,
      email,
      displayName: member.data.profile?.display_name ?? email ?? "Μέλος",
      role: member.data.role,
      isDemo: false,
    },
  };
}

/**
 * Guards server functions. The database RLS policies remain the real security
 * boundary; this check gives a clear error before any query runs.
 */
export async function requireMember(allowedRoles?: readonly MemberRole[]): Promise<SessionUser> {
  const state = await resolveAuthState();
  if (state.status !== "member") throw new AuthorizationError("Απαιτείται σύνδεση.");
  if (allowedRoles && !allowedRoles.includes(state.user.role)) throw new AuthorizationError();
  return state.user;
}

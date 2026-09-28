import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  AuthProvider,
  EmailLinkInput,
  LoginOptions,
  SignInInput,
  SignInResult,
} from "@/data/auth/auth-provider";
import { memberRoles, type AuthState } from "@/lib/auth-types";

const memberRowSchema = z.object({
  role: z.enum(memberRoles),
  status: z.enum(["active", "suspended"]),
  profile: z.object({ display_name: z.string() }).nullable(),
});

/** Supabase Auth with email + password; the session lives in HTTP-only cookies. */
export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly client: SupabaseClient) {}

  async getAuthState(): Promise<AuthState> {
    // getClaims() verifies the JWT signature; never trust getSession() on the server.
    const { data: claimsData, error: claimsError } = await this.client.auth.getClaims();
    const claims = claimsData?.claims;
    if (claimsError || !claims?.sub) return { status: "anonymous" };

    const email = typeof claims.email === "string" ? claims.email : null;
    const { data, error } = await this.client
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

  getLoginOptions(): LoginOptions {
    return { method: "password" };
  }

  async signIn(input: SignInInput): Promise<SignInResult> {
    if (input.method !== "password") {
      return { ok: false, message: "Αυτός ο τρόπος σύνδεσης δεν είναι διαθέσιμος." };
    }
    const { error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    // Deliberately generic: do not reveal whether the email exists.
    return error ? { ok: false, message: "Λάθος email ή κωδικός." } : { ok: true };
  }

  async signOut() {
    await this.client.auth.signOut();
  }

  async verifyEmailLink(input: EmailLinkInput): Promise<SignInResult> {
    const { error } = await this.client.auth.verifyOtp({
      token_hash: input.tokenHash,
      type: input.type,
    });
    return error
      ? { ok: false, message: "Ο σύνδεσμος έληξε ή έχει ήδη χρησιμοποιηθεί. Ζήτησε νέο." }
      : { ok: true };
  }

  async updatePassword(password: string): Promise<SignInResult> {
    const { data } = await this.client.auth.getClaims();
    if (!data?.claims?.sub) return { ok: false, message: "Απαιτείται σύνδεση." };
    const { error } = await this.client.auth.updateUser({ password });
    if (!error) return { ok: true };
    // "Secure password change": the last sign-in is too old.
    if (error.code === "reauthentication_needed" || /reauthenticat/i.test(error.message)) {
      return {
        ok: false,
        message: "Για λόγους ασφαλείας, αποσυνδέσου και συνδέσου ξανά πριν αλλάξεις κωδικό.",
      };
    }
    return { ok: false, message: "Ο κωδικός δεν άλλαξε. Δοκίμασε έναν πιο ισχυρό κωδικό." };
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/server/supabase";

/**
 * Service client for the few Auth admin operations a member cannot perform
 * with their own session (sending invitations, reading team e-mails).
 *
 * `SUPABASE_SECRET_KEY` is a server-only variable — never prefix it with
 * `VITE_`, which would ship it to browsers. Without it, inviting is disabled
 * and the team list shows no e-mail addresses. Always authorize the caller
 * (`requireMember`) before using this client: it bypasses RLS.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const secretKey = process.env["SUPABASE_SECRET_KEY"];
  if (!secretKey) return null;
  return createClient(getSupabaseConfig().url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

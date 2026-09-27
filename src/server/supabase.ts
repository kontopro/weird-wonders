import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCookies, setCookie, setResponseHeader } from "@tanstack/react-start/server";

export function getSupabaseConfig() {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !publishableKey) {
    throw new Error("Supabase mode requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
  return { url, publishableKey };
}

/**
 * Creates a Supabase client bound to the current request. The session is read
 * from, and refreshed into, HTTP-only cookies, so every visitor gets their own
 * client and RLS always sees the right user. Never cache the returned client
 * across requests.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const { url, publishableKey } = getSupabaseConfig();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookies, headers) => {
        for (const { name, value, options } of cookies) {
          setCookie(name, value, { ...options, httpOnly: true, secure: import.meta.env.PROD });
        }
        for (const [name, value] of Object.entries(headers ?? {})) {
          setResponseHeader(name, value);
        }
      },
    },
  });
}

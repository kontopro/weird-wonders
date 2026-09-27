import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDataSource } from "@/lib/data-source";
import { resolveAuthState } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(1024),
});

export type SignInResult = { ok: true } | { ok: false; message: string };

export const getAuthState = createServerFn({ method: "GET" }).handler(() => resolveAuthState());

export const signIn = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof credentialsSchema>) => credentialsSchema.parse(input))
  .handler(async ({ data }): Promise<SignInResult> => {
    if (getDataSource() !== "supabase") {
      return { ok: false, message: "Η σύνδεση είναι διαθέσιμη μόνο με ενεργό Supabase." };
    }
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      // Deliberately generic: do not reveal whether the email exists.
      return { ok: false, message: "Λάθος email ή κωδικός." };
    }
    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  if (getDataSource() !== "supabase") return;
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
});

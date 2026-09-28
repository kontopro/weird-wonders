import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hit, isLimited, visitorKey } from "@/server/rate-limit";
import {
  emailLinkTypes,
  type EmailLinkInput,
  type SignInInput,
  type SignInResult,
} from "@/data/auth/auth-provider";
import { resolveAuthState } from "@/server/auth";
import { getAuthProvider } from "@/server/repositories";

const signInSchema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal("password"),
      email: z.string().trim().email().max(320),
      password: z.string().min(1).max(1024),
    })
    .strict(),
  z.object({ method: z.literal("demo"), userId: z.string().min(1).max(100) }).strict(),
]);

export const getAuthState = createServerFn({ method: "GET" }).handler(() => resolveAuthState());

export const getLoginOptions = createServerFn({ method: "GET" }).handler(() =>
  getAuthProvider().getLoginOptions(),
);

export const signIn = createServerFn({ method: "POST" })
  .validator((input: SignInInput) => signInSchema.parse(input))
  .handler(async ({ data }): Promise<SignInResult> => {
    // Slows down password guessing: only failed attempts count.
    // Counted per visitor and per account, so switching IP addresses does not
    // help guessing one account's password.
    const visitor = visitorKey();
    const account = "email" in data && data.email ? `account:${data.email.toLowerCase()}` : "";
    if (isLimited("signIn", visitor)) {
      return {
        ok: false,
        message: "Πολλές αποτυχημένες προσπάθειες. Δοκίμασε ξανά σε λίγα λεπτά.",
      };
    }
    // Many failures for one account slow every attempt on it down instead of
    // blocking it, so nobody can lock a known member out on purpose.
    if (account && isLimited("signIn", account)) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
    const result = await getAuthProvider().signIn(data);
    if (!result.ok) {
      hit("signIn", visitor);
      if (account) hit("signIn", account);
    }
    return result;
  });

export const signOut = createServerFn({ method: "POST" }).handler(() =>
  getAuthProvider().signOut(),
);

const emailLinkSchema = z
  .object({ tokenHash: z.string().min(1).max(2048), type: z.enum(emailLinkTypes) })
  .strict();

export const verifyEmailLink = createServerFn({ method: "POST" })
  .validator((input: EmailLinkInput) => emailLinkSchema.parse(input))
  .handler(({ data }): Promise<SignInResult> => getAuthProvider().verifyEmailLink(data));

/** Minimum length only: long passphrases beat composition rules. */
export const passwordSchema = z
  .string()
  .min(10, "Ο κωδικός χρειάζεται τουλάχιστον 10 χαρακτήρες.")
  .max(128);

export const updatePassword = createServerFn({ method: "POST" })
  .validator((password: string) => passwordSchema.parse(password))
  .handler(({ data }): Promise<SignInResult> => getAuthProvider().updatePassword(data));

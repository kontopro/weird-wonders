import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SignInInput, SignInResult } from "@/data/auth/auth-provider";
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
  .handler(({ data }): Promise<SignInResult> => getAuthProvider().signIn(data));

export const signOut = createServerFn({ method: "POST" }).handler(() =>
  getAuthProvider().signOut(),
);

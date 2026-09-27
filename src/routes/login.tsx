import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import type { SignInInput } from "@/data/auth/auth-provider";
import { getAuthState, getLoginOptions, signIn, signOut } from "@/functions/auth";
import { memberRoleLabels } from "@/lib/auth-types";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ search }) => {
    const [auth, loginOptions] = await Promise.all([getAuthState(), getLoginOptions()]);
    if (auth.status === "member") {
      throw redirect({ href: safeRedirectPath(search.redirect) });
    }
    return { auth, loginOptions };
  },
  component: LoginPage,
  head: () => ({
    meta: [{ title: brandedTitle("Σύνδεση") }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

function LoginPage() {
  const { auth, loginOptions } = Route.useRouteContext();
  const search = Route.useSearch();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (input: SignInInput) => {
    setPending(true);
    setError(null);
    try {
      const result = await signIn({ data: input });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await router.invalidate();
      await router.navigate({ href: safeRedirectPath(search.redirect) });
    } catch {
      setError("Η σύνδεση δεν ολοκληρώθηκε. Έλεγξε τα στοιχεία και δοκίμασε ξανά.");
    } finally {
      setPending(false);
    }
  };

  const onPasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit({
      method: "password",
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
  };

  const onSignOut = async () => {
    await signOut();
    await router.invalidate();
  };

  const errorNote = error && (
    <p className="login-error" role="alert">
      {error}
    </p>
  );

  return (
    <main className="login-page">
      <section className="admin-panel login-card" aria-labelledby="login-title">
        <BrandLogo />
        <h1 id="login-title">Σύνδεση συντακτικής ομάδας</h1>

        {auth.status === "not_member" ? (
          <>
            <p className="login-note" role="alert">
              Ο λογαριασμός {auth.email ?? ""} δεν έχει ενεργή πρόσβαση στη διαχείριση. Ζήτησε
              πρόσκληση από τον διαχειριστή.
            </p>
            <Button variant="outline" onClick={onSignOut}>
              <LogOut /> Αποσύνδεση
            </Button>
          </>
        ) : loginOptions.method === "disabled" ? (
          <p className="login-note">{loginOptions.reason}</p>
        ) : loginOptions.method === "demo" ? (
          <>
            <p className="login-note">
              Demo λειτουργία: διάλεξε λογαριασμό για να δοκιμάσεις τη διαχείριση με τον αντίστοιχο
              ρόλο. Οι αλλαγές κρατιούνται μέχρι την επανεκκίνηση του server.
            </p>
            <ul className="demo-accounts">
              {loginOptions.accounts.map((account) => (
                <li key={account.id}>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => void submit({ method: "demo", userId: account.id })}
                  >
                    <UserRound />
                    <span>{account.displayName}</span>
                    <small>{memberRoleLabels[account.role]}</small>
                  </Button>
                </li>
              ))}
            </ul>
            {errorNote}
          </>
        ) : (
          <form className="admin-form-grid login-form" onSubmit={onPasswordSubmit} noValidate>
            <label className="full">
              <span>Email</span>
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label className="full">
              <span>Κωδικός</span>
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            {error && <div className="full">{errorNote}</div>}
            <Button type="submit" className="full" disabled={pending}>
              <LogIn /> {pending ? "Σύνδεση…" : "Σύνδεση"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

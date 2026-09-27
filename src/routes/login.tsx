import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import { getAuthState, signIn, signOut } from "@/functions/auth";
import { getDataSource } from "@/lib/data-source";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ search }) => {
    const auth = await getAuthState();
    if (auth.status === "member") {
      throw redirect({ href: safeRedirectPath(search.redirect) });
    }
    return { auth };
  },
  component: LoginPage,
  head: () => ({
    meta: [{ title: brandedTitle("Σύνδεση") }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

function LoginPage() {
  const { auth } = Route.useRouteContext();
  const search = Route.useSearch();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSupabase = getDataSource() === "supabase";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const result = await signIn({
        data: {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        },
      });
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

  const onSignOut = async () => {
    await signOut();
    await router.invalidate();
  };

  return (
    <main className="login-page">
      <section className="admin-panel login-card" aria-labelledby="login-title">
        <BrandLogo />
        <h1 id="login-title">Σύνδεση συντακτικής ομάδας</h1>

        {!isSupabase ? (
          <p className="login-note">
            Το site τρέχει με demo δεδομένα, χωρίς λογαριασμούς. Η διαχείριση ανοίγει μόνο σε τοπική
            ανάπτυξη ή όταν οριστεί <code>VITE_ENABLE_DEMO_ADMIN=true</code>.
          </p>
        ) : auth.status === "not_member" ? (
          <>
            <p className="login-note" role="alert">
              Ο λογαριασμός {auth.email ?? ""} δεν έχει ενεργή πρόσβαση στη διαχείριση. Ζήτησε
              πρόσκληση από τον διαχειριστή.
            </p>
            <Button variant="outline" onClick={onSignOut}>
              <LogOut /> Αποσύνδεση
            </Button>
          </>
        ) : (
          <form className="admin-form-grid login-form" onSubmit={onSubmit} noValidate>
            <label className="full">
              <span>Email</span>
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label className="full">
              <span>Κωδικός</span>
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            {error && (
              <p className="login-error full" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="full" disabled={pending}>
              <LogIn /> {pending ? "Σύνδεση…" : "Σύνδεση"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

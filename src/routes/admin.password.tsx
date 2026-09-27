import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import { passwordSchema, updatePassword } from "@/functions/auth";

export const Route = createFileRoute("/admin/password")({
  component: PasswordPage,
  head: () => ({ meta: [{ title: brandedTitle("Κωδικός πρόσβασης") }] }),
});

/** Where invited members land after accepting, and where anyone changes their password. */
function PasswordPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const checked = passwordSchema.safeParse(password);
    if (!checked.success)
      return setError(checked.error.issues[0]?.message ?? "Μη έγκυρος κωδικός.");
    if (password !== confirm) return setError("Οι δύο κωδικοί δεν ταιριάζουν.");

    setPending(true);
    setError(null);
    try {
      const result = await updatePassword({ data: password });
      if (!result.ok) return setError(result.message);
      toast.success("Ο κωδικός αποθηκεύτηκε.");
      await navigate({ to: "/admin" });
    } catch {
      setError("Ο κωδικός δεν αποθηκεύτηκε. Δοκίμασε ξανά.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-overline">Λογαριασμός</p>
          <h1>Κωδικός πρόσβασης</h1>
          <p>Όρισε τον κωδικό με τον οποίο θα συνδέεσαι. Προτίμησε μια μεγάλη φράση.</p>
        </div>
      </header>
      <section className="admin-panel profile-form">
        {user.isDemo ? (
          <p className="login-note">Οι demo λογαριασμοί δεν έχουν κωδικό.</p>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="admin-form-grid">
              <label>
                <span>Νέος κωδικός</span>
                <input name="password" type="password" autoComplete="new-password" required />
              </label>
              <label>
                <span>Επανάληψη</span>
                <input name="confirm" type="password" autoComplete="new-password" required />
              </label>
              {error && (
                <p className="login-error full" role="alert">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" disabled={pending}>
              <KeyRound /> {pending ? "Αποθήκευση…" : "Αποθήκευση κωδικού"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

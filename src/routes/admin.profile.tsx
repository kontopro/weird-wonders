import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import { authorApi } from "@/data/authors";
import { initialsOf, memberRoleLabels } from "@/lib/auth-types";
import { errorMessage } from "@/lib/error-message";

export const Route = createFileRoute("/admin/profile")({
  loader: () => authorApi.getMyProfile(),
  component: ProfileAdmin,
  head: () => ({ meta: [{ title: brandedTitle("Προφίλ") }] }),
});

function ProfileAdmin() {
  const { profile, email, role } = Route.useLoaderData();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [slug, setSlug] = useState(profile.slug);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await authorApi.updateMyProfile({ displayName, slug, bio });
      toast.success("Το προφίλ αποθηκεύτηκε.");
      // Refreshes the sidebar name as well.
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-overline">Λογαριασμός</p>
          <h1>Προφίλ</h1>
          <p>Τα στοιχεία που εμφανίζονται στα άρθρα σου και στη σελίδα συντάκτη.</p>
        </div>
      </header>
      <form className="admin-panel profile-form" onSubmit={onSubmit}>
        <div className="profile-photo">
          <div className="admin-avatar large" aria-hidden="true">
            {initialsOf(displayName)}
          </div>
        </div>
        <div className="admin-form-grid">
          <label>
            <span>Εμφανιζόμενο όνομα</span>
            <input
              required
              maxLength={100}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label>
            <span>Διεύθυνση σελίδας συντάκτη</span>
            <input
              required
              maxLength={120}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={email ?? "—"} disabled />
          </label>
          <label>
            <span>Ρόλος</span>
            <input value={memberRoleLabels[role]} disabled />
          </label>
          <label className="full">
            <span>Σύντομο βιογραφικό</span>
            <textarea maxLength={1000} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Αποθήκευση…" : "Αποθήκευση αλλαγών"}
        </Button>
      </form>
    </div>
  );
}

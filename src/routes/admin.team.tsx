import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Mail, UserMinus, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { brandedTitle } from "@/config/site";
import { teamApi } from "@/data/team";
import {
  assignableRoles,
  canManageMember,
  canManageTeam,
  memberRoleDescriptions,
  memberStatusLabels,
  type InviteInput,
  type TeamMember,
} from "@/domain/team";
import { initialsOf, memberRoleLabels, type MemberRole } from "@/lib/auth-types";
import { errorMessage } from "@/lib/error-message";

export const Route = createFileRoute("/admin/team")({
  beforeLoad: ({ context }) => {
    if (!canManageTeam(context.user.role)) throw redirect({ to: "/admin" });
  },
  loader: () => teamApi.list(),
  component: TeamAdmin,
  head: () => ({ meta: [{ title: brandedTitle("Ομάδα") }] }),
});

const emptyInvite = (role: MemberRole): InviteInput => ({ email: "", displayName: "", role });

function TeamAdmin() {
  const members = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const roles = assignableRoles(user.role);
  const actor = { id: user.id, role: user.role };

  const [invite, setInvite] = useState<InviteInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<TeamMember>();

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await router.invalidate();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!invite) return;
    setBusy(true);
    try {
      const { member, emailSent } = await teamApi.invite(invite);
      toast.success(
        emailSent
          ? `Στάλθηκε πρόσκληση στο ${member.email ?? invite.email}.`
          : `Ο/Η ${member.displayName} προστέθηκε στην ομάδα.`,
      );
      setInvite(null);
      await router.invalidate();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const change = (member: TeamMember, next: Partial<Pick<TeamMember, "role" | "status">>) =>
    run(
      () =>
        teamApi.update({
          userId: member.userId,
          role: next.role ?? member.role,
          status: next.status ?? member.status,
        }),
      next.status === "suspended"
        ? `Ο/Η ${member.displayName} τέθηκε σε αναστολή.`
        : next.status === "active"
          ? `Ο/Η ${member.displayName} είναι ξανά ενεργός/ή.`
          : "Ο ρόλος άλλαξε.",
    );

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-overline">Συντακτική ομάδα</p>
          <h1>Ομάδα</h1>
          <p>
            {members.length} μέλη. Οι ρόλοι ορίζουν τι μπορεί να κάνει ο καθένας στη διαχείριση.
          </p>
        </div>
        {!invite && (
          <Button
            onClick={() => setInvite(emptyInvite(roles.includes("author") ? "author" : roles[0]!))}
          >
            <UserPlus /> Πρόσκληση μέλους
          </Button>
        )}
      </header>

      {invite && (
        <section className="admin-panel category-form">
          <form onSubmit={onInvite}>
            <h2>Πρόσκληση μέλους</h2>
            <div className="admin-form-grid">
              <label>
                <span>Όνομα</span>
                <input
                  required
                  maxLength={100}
                  value={invite.displayName}
                  onChange={(e) => setInvite({ ...invite, displayName: e.target.value })}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  required
                  type="email"
                  maxLength={320}
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                />
              </label>
              <label className="full">
                <span>Ρόλος</span>
                <select
                  value={invite.role}
                  onChange={(e) => setInvite({ ...invite, role: e.target.value as MemberRole })}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {memberRoleLabels[role]} — {memberRoleDescriptions[role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="admin-empty-note">
              <Mail aria-hidden="true" /> Το νέο μέλος λαμβάνει email για να ορίσει κωδικό. Αν έχει
              ήδη λογαριασμό, αποκτά πρόσβαση αμέσως.
            </p>
            <div className="form-actions">
              <Button type="button" variant="outline" onClick={() => setInvite(null)}>
                Ακύρωση
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Αποστολή…" : "Αποστολή πρόσκλησης"}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-panel team-list" aria-label="Μέλη ομάδας">
        {members.map((member) => {
          const manageable = canManageMember(actor, member);
          const isSelf = member.userId === user.id;
          return (
            <article
              key={member.userId}
              className={member.status === "suspended" ? "is-suspended" : ""}
            >
              <div className="admin-avatar" aria-hidden="true">
                {initialsOf(member.displayName)}
              </div>
              <div className="team-identity">
                <strong>
                  {member.displayName}
                  {isSelf && <small> (εσύ)</small>}
                </strong>
                <span>
                  {member.email ?? "email μη διαθέσιμο"} ·{" "}
                  {member.articleCount === 1 ? "1 άρθρο" : `${member.articleCount} άρθρα`}
                </span>
              </div>
              {manageable ? (
                <label className="team-role">
                  <span className="sr-only">Ρόλος του/της {member.displayName}</span>
                  <select
                    value={member.role}
                    disabled={busy}
                    onChange={(e) => void change(member, { role: e.target.value as MemberRole })}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {memberRoleLabels[role]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="team-role">{memberRoleLabels[member.role]}</span>
              )}
              <span className={`team-status status-${member.status}`}>
                {memberStatusLabels[member.status]}
              </span>
              <div className="row-actions">
                {manageable && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void change(member, {
                          status: member.status === "active" ? "suspended" : "active",
                        })
                      }
                    >
                      {member.status === "active" ? "Αναστολή" : "Επανενεργοποίηση"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy || member.articleCount > 0}
                      title={
                        member.articleCount > 0
                          ? "Μέλη με άρθρα μπαίνουν σε αναστολή, δεν διαγράφονται."
                          : undefined
                      }
                      onClick={() => setRemoving(member)}
                      aria-label={`Αφαίρεση: ${member.displayName}`}
                    >
                      <UserMinus />
                    </Button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={`Αφαίρεση του/της «${removing?.displayName ?? ""}» από την ομάδα;`}
        description="Χάνει την πρόσβαση στη διαχείριση. Ο λογαριασμός και το δημόσιο προφίλ δεν διαγράφονται."
        confirmLabel="Αφαίρεση"
        onConfirm={() => {
          const target = removing;
          setRemoving(undefined);
          if (target) {
            void run(() => teamApi.remove(target.userId), `Ο/Η ${target.displayName} αφαιρέθηκε.`);
          }
        }}
      />
    </div>
  );
}

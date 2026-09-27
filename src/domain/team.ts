import { z } from "zod";
import { memberRoles, type MemberRole } from "@/lib/auth-types";

/**
 * Editorial team rules. They mirror `private.can_manage_member` and the
 * last-owner trigger in the database, so mock mode behaves like production.
 */

export const memberStatuses = ["active", "suspended"] as const;
export type MemberStatus = (typeof memberStatuses)[number];

export const memberStatusLabels: Record<MemberStatus, string> = {
  active: "Ενεργό",
  suspended: "Σε αναστολή",
};

export const memberRoleDescriptions: Record<MemberRole, string> = {
  owner: "Πλήρης πρόσβαση, και στη διαχείριση ιδιοκτητών.",
  admin: "Διαχειρίζεται την ομάδα και όλο το περιεχόμενο.",
  editor: "Δημοσιεύει, επιμελείται και οργανώνει κατηγορίες και ετικέτες.",
  author: "Γράφει δικά του πρόχειρα και τα στέλνει για έλεγχο.",
};

export type TeamMember = {
  userId: string;
  displayName: string;
  slug: string;
  /** Null when the adapter cannot see e-mail addresses. */
  email: string | null;
  role: MemberRole;
  status: MemberStatus;
  /** Members with articles can be suspended but not removed (keeps bylines intact). */
  articleCount: number;
};

export type TeamActor = { id: string; role: MemberRole };

/** Roles the actor may hand out: owners any role, admins any role but owner. */
export function assignableRoles(actorRole: MemberRole): MemberRole[] {
  if (actorRole === "owner") return [...memberRoles];
  if (actorRole === "admin") return memberRoles.filter((role) => role !== "owner");
  return [];
}

export function canManageTeam(actorRole: MemberRole) {
  return assignableRoles(actorRole).length > 0;
}

/**
 * Whether the actor may change or remove this member. People never change
 * their own membership here, which prevents accidental lock-outs.
 */
export function canManageMember(actor: TeamActor, target: { userId: string; role: MemberRole }) {
  return actor.id !== target.userId && assignableRoles(actor.role).includes(target.role);
}

/** True when the change would leave the blog without an active owner. */
export function removesLastOwner(
  members: ReadonlyArray<{ userId: string; role: MemberRole; status: MemberStatus }>,
  target: { userId: string; role: MemberRole; status: MemberStatus },
  next: { role: MemberRole; status: MemberStatus } | null,
) {
  const wasActiveOwner = target.role === "owner" && target.status === "active";
  const staysActiveOwner = next?.role === "owner" && next.status === "active";
  if (!wasActiveOwner || staysActiveOwner) return false;
  const activeOwners = members.filter(
    (member) => member.role === "owner" && member.status === "active",
  );
  return activeOwners.length <= 1;
}

export const inviteInputSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Γράψε ένα έγκυρο email.").max(320),
    displayName: z.string().trim().min(1, "Το όνομα είναι υποχρεωτικό.").max(100),
    role: z.enum(memberRoles),
  })
  .strict();
export type InviteInput = z.infer<typeof inviteInputSchema>;

export const memberUpdateSchema = z
  .object({
    userId: z.string().min(1).max(100),
    role: z.enum(memberRoles),
    status: z.enum(memberStatuses),
  })
  .strict();
export type MemberUpdate = z.infer<typeof memberUpdateSchema>;

export const teamMessages = {
  forbidden: "Δεν μπορείς να διαχειριστείς αυτό το μέλος.",
  roleForbidden: "Δεν μπορείς να δώσεις αυτόν τον ρόλο.",
  lastOwner: "Η ομάδα πρέπει να έχει πάντα τουλάχιστον έναν ενεργό ιδιοκτήτη.",
  hasContent:
    "Το μέλος έχει άρθρα. Βάλ’ το σε αναστολή αντί για διαγραφή, ώστε να μείνουν οι υπογραφές.",
  alreadyMember: "Αυτό το email ανήκει ήδη σε μέλος της ομάδας.",
  notFound: "Το μέλος δεν βρέθηκε.",
} as const;

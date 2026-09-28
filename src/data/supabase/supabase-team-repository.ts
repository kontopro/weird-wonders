import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { toDomainError } from "@/data/supabase/supabase-errors";
import type { InviteResult, TeamRepository } from "@/data/team/team-repository";
import { DomainError } from "@/domain/errors";
import {
  assignableRoles,
  canManageMember,
  canManageTeam,
  memberStatuses,
  removesLastOwner,
  teamMessages,
  type InviteInput,
  type MemberUpdate,
  type TeamActor,
  type TeamMember,
} from "@/domain/team";
import { memberRoles } from "@/lib/auth-types";

const memberRowSchema = z.object({
  user_id: z.string(),
  role: z.enum(memberRoles),
  status: z.enum(memberStatuses),
  profile: z.object({ display_name: z.string(), slug: z.string() }).nullable(),
});
type MemberRow = z.infer<typeof memberRowSchema>;

// The FK is named because `members` has two foreign keys to `profiles` (member and inviter).
const MEMBER_COLUMNS =
  "user_id, role, status, profile:profiles!members_user_id_fkey(display_name, slug)";
const roleOrder = (role: TeamMember["role"]) => memberRoles.indexOf(role);

/**
 * Team management on Supabase. Membership rows are written with the signed-in
 * member's own client, so RLS (`private.can_manage_member`) and the last-owner
 * trigger decide; the admin client is used only for Auth invitations and to
 * read e-mail addresses, after the caller has been authorized.
 */
export class SupabaseTeamRepository implements TeamRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly admin: SupabaseClient | null,
    /** Absolute URL invited people land on after accepting (e.g. https://blog.gr/admin/password). */
    private readonly inviteRedirectUrl: string,
  ) {}

  private async rows(): Promise<MemberRow[]> {
    const { data, error } = await this.client.from("members").select(MEMBER_COLUMNS);
    if (error) throw toDomainError(error, "");
    return z.array(memberRowSchema).parse(data ?? []);
  }

  private async articleCounts() {
    const { data, error } = await this.client.from("articles").select("author_id");
    if (error) throw toDomainError(error, "");
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const id = row.author_id as string | null;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }

  /** E-mails live on Auth accounts; only the admin client can read them. */
  private async emails() {
    const emails = new Map<string, string>();
    if (!this.admin) return emails;
    // A blog team is small; one page covers it.
    const { data, error } = await this.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) if (user.email) emails.set(user.id, user.email.toLowerCase());
    return emails;
  }

  private toMember(row: MemberRow, emails: Map<string, string>, counts: Map<string, number>) {
    return {
      userId: row.user_id,
      displayName: row.profile?.display_name ?? "Μέλος",
      slug: row.profile?.slug ?? "",
      email: emails.get(row.user_id) ?? null,
      role: row.role,
      status: row.status,
      articleCount: counts.get(row.user_id) ?? 0,
    } satisfies TeamMember;
  }

  async list() {
    const [rows, emails, counts] = await Promise.all([
      this.rows(),
      this.emails(),
      this.articleCounts(),
    ]);
    return rows
      .map((row) => this.toMember(row, emails, counts))
      .sort(
        (a, b) =>
          roleOrder(a.role) - roleOrder(b.role) || a.displayName.localeCompare(b.displayName, "el"),
      );
  }

  private async findMember(userId: string) {
    const member = (await this.list()).find((item) => item.userId === userId);
    if (!member) throw new DomainError(teamMessages.notFound, "not_found");
    return member;
  }

  async invite(input: InviteInput, actor: TeamActor): Promise<InviteResult> {
    if (!canManageTeam(actor.role)) throw new DomainError(teamMessages.forbidden, "forbidden");
    if (!assignableRoles(actor.role).includes(input.role)) {
      throw new DomainError(teamMessages.roleForbidden, "forbidden");
    }
    if (!this.admin) {
      throw new DomainError(
        "Οι προσκλήσεις χρειάζονται το SUPABASE_SECRET_KEY στον server.",
        "invalid",
      );
    }

    const { data: users, error: listError } = await this.admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw listError;
    const existing = users.users.find((user) => user.email?.toLowerCase() === input.email);

    let userId: string;
    let emailSent = false;
    if (existing) {
      // Already has an account (e.g. a former member): grant access, no e-mail.
      if ((await this.rows()).some((row) => row.user_id === existing.id)) {
        throw new DomainError(teamMessages.alreadyMember, "conflict");
      }
      // Only if the address was proven by its owner: otherwise anyone who
      // registered that address first would receive the role.
      if (!existing.email_confirmed_at) {
        throw new DomainError(
          "Υπάρχει λογαριασμός με αυτό το email χωρίς επιβεβαιωμένη διεύθυνση. Διέγραψέ τον από το Supabase (Authentication → Users) και στείλε ξανά την πρόσκληση.",
          "conflict",
        );
      }
      userId = existing.id;
    } else {
      const { data, error } = await this.admin.auth.admin.inviteUserByEmail(input.email, {
        data: { display_name: input.displayName },
        redirectTo: this.inviteRedirectUrl,
      });
      if (error) throw error;
      userId = data.user.id;
      emailSent = true;
    }

    const { error } = await this.client
      .from("members")
      .insert({ user_id: userId, role: input.role, invited_by: actor.id });
    if (error) {
      // Do not leave an invited account without a membership behind.
      if (emailSent) await this.admin.auth.admin.deleteUser(userId);
      throw toDomainError(error, teamMessages.alreadyMember);
    }
    return { member: await this.findMember(userId), emailSent };
  }

  async update(input: MemberUpdate, actor: TeamActor) {
    const members = await this.list();
    const member = members.find((item) => item.userId === input.userId);
    if (!member) throw new DomainError(teamMessages.notFound, "not_found");
    if (!canManageMember(actor, member)) throw new DomainError(teamMessages.forbidden, "forbidden");
    if (!assignableRoles(actor.role).includes(input.role)) {
      throw new DomainError(teamMessages.roleForbidden, "forbidden");
    }
    if (removesLastOwner(members, member, input)) {
      throw new DomainError(teamMessages.lastOwner, "conflict");
    }
    const { error } = await this.client
      .from("members")
      .update({ role: input.role, status: input.status })
      .eq("user_id", input.userId);
    if (error) throw toDomainError(error, "");
    return this.findMember(input.userId);
  }

  async remove(userId: string, actor: TeamActor) {
    const members = await this.list();
    const member = members.find((item) => item.userId === userId);
    if (!member) throw new DomainError(teamMessages.notFound, "not_found");
    if (!canManageMember(actor, member)) throw new DomainError(teamMessages.forbidden, "forbidden");
    if (removesLastOwner(members, member, null)) {
      throw new DomainError(teamMessages.lastOwner, "conflict");
    }
    if (member.articleCount > 0) throw new DomainError(teamMessages.hasContent, "conflict");

    const { error } = await this.client.from("members").delete().eq("user_id", userId);
    // 23503: still referenced (e.g. uploaded media) — suspend instead.
    if (error?.code === "23503") throw new DomainError(teamMessages.hasContent, "conflict");
    if (error) throw toDomainError(error, "");
  }
}

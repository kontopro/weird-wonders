import type { InviteInput, MemberUpdate, TeamActor, TeamMember } from "@/domain/team";

/** What the invite did, so the UI can tell the inviter what happens next. */
export type InviteResult = {
  member: TeamMember;
  /** True when an invitation e-mail was sent (false in demo mode or for existing accounts). */
  emailSent: boolean;
};

export interface TeamRepository {
  list(): Promise<TeamMember[]>;
  invite(input: InviteInput, actor: TeamActor): Promise<InviteResult>;
  update(input: MemberUpdate, actor: TeamActor): Promise<TeamMember>;
  /** Removes the membership only; the public profile and bylines stay. */
  remove(userId: string, actor: TeamActor): Promise<void>;
}

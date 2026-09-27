import type { InviteInput, MemberUpdate } from "@/domain/team";
import { inviteMember, listTeam, removeMember, updateMember } from "@/functions/team";

/** Isomorphic entry point; every call runs on the server. */
export const teamApi = {
  list: () => listTeam(),
  invite: (input: InviteInput) => inviteMember({ data: input }),
  update: (input: MemberUpdate) => updateMember({ data: input }),
  remove: (userId: string) => removeMember({ data: userId }),
};

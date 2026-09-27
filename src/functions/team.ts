import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  inviteInputSchema,
  memberUpdateSchema,
  type InviteInput,
  type MemberUpdate,
} from "@/domain/team";
import { requireMember } from "@/server/auth";
import { getRepositories } from "@/server/repositories";

/** Only owners and admins manage the team; the adapters check each action again. */
const teamManagers = ["owner", "admin"] as const;

const actorOf = async () => {
  const user = await requireMember(teamManagers);
  return { id: user.id, role: user.role };
};

export const listTeam = createServerFn({ method: "GET" }).handler(async () => {
  await actorOf();
  return getRepositories().team.list();
});

export const inviteMember = createServerFn({ method: "POST" })
  .validator((input: InviteInput) => inviteInputSchema.parse(input))
  .handler(async ({ data }) => getRepositories().team.invite(data, await actorOf()));

export const updateMember = createServerFn({ method: "POST" })
  .validator((input: MemberUpdate) => memberUpdateSchema.parse(input))
  .handler(async ({ data }) => getRepositories().team.update(data, await actorOf()));

export const removeMember = createServerFn({ method: "POST" })
  .validator((userId: string) => z.string().min(1).max(100).parse(userId))
  .handler(async ({ data }) => {
    await getRepositories().team.remove(data, await actorOf());
  });

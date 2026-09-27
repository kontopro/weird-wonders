import type { MockStore } from "@/data/mock/mock-store";
import type { InviteResult, TeamRepository } from "@/data/team/team-repository";
import { DomainError } from "@/domain/errors";
import {
  assignableRoles,
  canManageMember,
  canManageTeam,
  removesLastOwner,
  teamMessages,
  type InviteInput,
  type MemberUpdate,
  type TeamActor,
  type TeamMember,
} from "@/domain/team";
import { memberRoles } from "@/lib/auth-types";
import { slugify } from "@/lib/slug";

const roleOrder = (role: TeamMember["role"]) => memberRoles.indexOf(role);

/** In-memory team for mock mode, applying the same rules as the database. */
export class MockTeamRepository implements TeamRepository {
  constructor(private readonly store: MockStore) {}

  private toMember(member: MockStore["members"][number]): TeamMember {
    const profile = this.store.profiles.find((item) => item.id === member.userId);
    return {
      userId: member.userId,
      displayName: profile?.displayName ?? member.email,
      slug: profile?.slug ?? "",
      email: member.email,
      role: member.role,
      status: member.status,
      articleCount: this.store.articles.filter((article) => article.authorId === member.userId)
        .length,
    };
  }

  private target(userId: string) {
    const member = this.store.members.find((item) => item.userId === userId);
    if (!member) throw new DomainError(teamMessages.notFound, "not_found");
    return member;
  }

  private uniqueSlug(name: string) {
    const base = slugify(name) || "member";
    let slug = base;
    for (let n = 2; this.store.profiles.some((profile) => profile.slug === slug); n++) {
      slug = `${base}-${n}`;
    }
    return slug;
  }

  async list() {
    return this.store.members
      .map((member) => this.toMember(member))
      .sort(
        (a, b) =>
          roleOrder(a.role) - roleOrder(b.role) || a.displayName.localeCompare(b.displayName, "el"),
      );
  }

  async invite(input: InviteInput, actor: TeamActor): Promise<InviteResult> {
    if (!canManageTeam(actor.role)) throw new DomainError(teamMessages.forbidden, "forbidden");
    if (!assignableRoles(actor.role).includes(input.role)) {
      throw new DomainError(teamMessages.roleForbidden, "forbidden");
    }
    if (this.store.members.some((member) => member.email === input.email)) {
      throw new DomainError(teamMessages.alreadyMember, "conflict");
    }

    const userId = crypto.randomUUID();
    this.store.profiles.push({
      id: userId,
      slug: this.uniqueSlug(input.displayName),
      displayName: input.displayName,
      bio: "",
    });
    const member = { userId, email: input.email, role: input.role, status: "active" as const };
    this.store.members.push(member);
    // Demo mode sends no e-mail: the new member appears among the demo accounts.
    return { member: this.toMember(member), emailSent: false };
  }

  async update(input: MemberUpdate, actor: TeamActor) {
    const member = this.target(input.userId);
    if (!canManageMember(actor, member)) throw new DomainError(teamMessages.forbidden, "forbidden");
    if (!assignableRoles(actor.role).includes(input.role)) {
      throw new DomainError(teamMessages.roleForbidden, "forbidden");
    }
    if (removesLastOwner(this.store.members, member, input)) {
      throw new DomainError(teamMessages.lastOwner, "conflict");
    }
    member.role = input.role;
    member.status = input.status;
    return this.toMember(member);
  }

  async remove(userId: string, actor: TeamActor) {
    const member = this.target(userId);
    if (!canManageMember(actor, member)) throw new DomainError(teamMessages.forbidden, "forbidden");
    if (removesLastOwner(this.store.members, member, null)) {
      throw new DomainError(teamMessages.lastOwner, "conflict");
    }
    // Mirrors the restrictive foreign key from articles to members.
    if (this.store.articles.some((article) => article.authorId === userId)) {
      throw new DomainError(teamMessages.hasContent, "conflict");
    }
    this.store.members = this.store.members.filter((item) => item.userId !== userId);
  }
}

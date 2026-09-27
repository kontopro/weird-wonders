import { beforeEach, describe, expect, test } from "bun:test";
import { createDemoStore, DEMO_USER_ID } from "@/data/mock/demo-seed";
import type { MockStore } from "@/data/mock/mock-store";
import { MockTeamRepository } from "@/data/mock/mock-team-repository";
import type { TeamActor } from "@/domain/team";

const owner: TeamActor = { id: DEMO_USER_ID, role: "owner" };
const admin: TeamActor = { id: "author-aris", role: "admin" };
const editor: TeamActor = { id: "author-aris", role: "editor" };

let store: MockStore;
let team: MockTeamRepository;

beforeEach(() => {
  store = createDemoStore();
  team = new MockTeamRepository(store);
});

describe("MockTeamRepository", () => {
  test("lists members by role with e-mail and article counts", async () => {
    const members = await team.list();
    expect(members[0]).toMatchObject({ userId: DEMO_USER_ID, role: "owner" });
    expect(members.every((member) => member.email?.endsWith("@example.com"))).toBe(true);
    expect(members.find((member) => member.userId === "author-eva")?.articleCount).toBeGreaterThan(
      0,
    );
  });

  test("invites a member who can then sign in, and rejects duplicates", async () => {
    const { member, emailSent } = await team.invite(
      { email: "new@example.com", displayName: "Νέα Συντάκτρια", role: "author" },
      owner,
    );
    expect(emailSent).toBe(false);
    expect(member).toMatchObject({ role: "author", status: "active", slug: "nea-syntaktria" });
    await expect(
      team.invite({ email: "new@example.com", displayName: "Άλλη", role: "author" }, owner),
    ).rejects.toThrow("ήδη");
  });

  test("admins cannot create or manage owners; editors cannot manage the team", async () => {
    store.members.find((member) => member.userId === "author-aris")!.role = "admin";
    await expect(
      team.invite({ email: "o@example.com", displayName: "O", role: "owner" }, admin),
    ).rejects.toThrow();
    await expect(
      team.update({ userId: DEMO_USER_ID, role: "admin", status: "active" }, admin),
    ).rejects.toThrow();
    await expect(
      team.update({ userId: "author-eva", role: "editor", status: "active" }, editor),
    ).rejects.toThrow();
    const promoted = await team.update(
      { userId: "author-eva", role: "editor", status: "active" },
      admin,
    );
    expect(promoted.role).toBe("editor");
  });

  test("never leaves the team without an active owner", async () => {
    const second: TeamActor = { id: "author-aris", role: "owner" };
    store.members.find((member) => member.userId === "author-aris")!.role = "owner";
    await team.update({ userId: DEMO_USER_ID, role: "editor", status: "active" }, second);
    await expect(
      team.update({ userId: "author-aris", role: "owner", status: "suspended" }, owner),
    ).rejects.toThrow("ιδιοκτήτη");
  });

  test("suspends members with articles but only removes members without them", async () => {
    await expect(team.remove("author-eva", owner)).rejects.toThrow("αναστολή");
    const suspended = await team.update(
      { userId: "author-eva", role: "author", status: "suspended" },
      owner,
    );
    expect(suspended.status).toBe("suspended");

    const { member } = await team.invite(
      { email: "temp@example.com", displayName: "Προσωρινός", role: "author" },
      owner,
    );
    await team.remove(member.userId, owner);
    expect((await team.list()).some((item) => item.userId === member.userId)).toBe(false);
    expect(store.profiles.some((profile) => profile.id === member.userId)).toBe(true);
  });

  test("nobody manages their own membership", async () => {
    await expect(
      team.update({ userId: DEMO_USER_ID, role: "owner", status: "suspended" }, owner),
    ).rejects.toThrow();
  });
});

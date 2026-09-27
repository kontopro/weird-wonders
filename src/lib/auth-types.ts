export const memberRoles = ["owner", "admin", "editor", "author"] as const;
export type MemberRole = (typeof memberRoles)[number];

export const memberRoleLabels: Record<MemberRole, string> = {
  owner: "Ιδιοκτήτης",
  admin: "Διαχειριστής",
  editor: "Επιμελητής",
  author: "Συντάκτης",
};

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string;
  role: MemberRole;
  isDemo: boolean;
};

export type AuthState =
  | { status: "anonymous" }
  | { status: "not_member"; email: string | null }
  | { status: "member"; user: SessionUser };

export function initialsOf(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

import type {
  AuthProvider,
  LoginOptions,
  SessionCookie,
  SignInInput,
  SignInResult,
} from "@/data/auth/auth-provider";
import type { MockStore } from "@/data/mock/mock-store";
import type { AuthState } from "@/lib/auth-types";

/**
 * Demo sign-in for mock mode: pick one of the seeded members (owner, editor,
 * author…) to try the admin with that role. There are no passwords, so it is
 * enabled only in development or when a demo deployment opts in.
 */
export class MockAuthProvider implements AuthProvider {
  constructor(
    private readonly store: MockStore,
    private readonly session: SessionCookie,
    private readonly enabled: boolean,
  ) {}

  private activeMember(userId: string | undefined) {
    if (!userId) return null;
    const member = this.store.members.find((item) => item.userId === userId);
    const profile = this.store.profiles.find((item) => item.id === userId);
    if (!member || !profile || member.status !== "active") return null;
    return { member, profile };
  }

  async getAuthState(): Promise<AuthState> {
    if (!this.enabled) return { status: "anonymous" };
    const found = this.activeMember(this.session.get());
    if (!found) return { status: "anonymous" };
    return {
      status: "member",
      user: {
        id: found.profile.id,
        email: null,
        displayName: found.profile.displayName,
        role: found.member.role,
        isDemo: true,
      },
    };
  }

  getLoginOptions(): LoginOptions {
    if (!this.enabled) {
      return {
        method: "disabled",
        reason:
          "Το site τρέχει με demo δεδομένα. Η διαχείριση ανοίγει σε τοπική ανάπτυξη ή όταν οριστεί VITE_ENABLE_DEMO_ADMIN=true.",
      };
    }
    return {
      method: "demo",
      accounts: this.store.members
        .filter((member) => member.status === "active")
        .flatMap((member) => {
          const profile = this.store.profiles.find((item) => item.id === member.userId);
          return profile
            ? [{ id: profile.id, displayName: profile.displayName, role: member.role }]
            : [];
        }),
    };
  }

  async signIn(input: SignInInput): Promise<SignInResult> {
    if (!this.enabled || input.method !== "demo") {
      return { ok: false, message: "Αυτός ο τρόπος σύνδεσης δεν είναι διαθέσιμος." };
    }
    if (!this.activeMember(input.userId)) {
      return { ok: false, message: "Ο demo λογαριασμός δεν βρέθηκε." };
    }
    this.session.set(input.userId);
    return { ok: true };
  }

  async signOut() {
    this.session.clear();
  }
}

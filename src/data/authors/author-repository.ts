import type { AuthorProfile, ProfileInput } from "@/domain/authors";

export interface AuthorRepository {
  /** Public author page. Returns null when the author has no published article. */
  findPublicBySlug(slug: string): Promise<AuthorProfile | null>;
  getProfile(userId: string): Promise<AuthorProfile | null>;
  updateProfile(userId: string, input: ProfileInput): Promise<AuthorProfile>;
}

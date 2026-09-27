import type { AuthorRepository } from "@/data/authors/author-repository";
import { scheduleOf, type MockStore } from "@/data/mock/mock-store";
import type { AuthorProfile, ProfileInput } from "@/domain/authors";
import { DomainError } from "@/domain/errors";
import { isPubliclyVisible } from "@/domain/publishing";

export class MockAuthorRepository implements AuthorRepository {
  constructor(private readonly store: MockStore) {}

  async findPublicBySlug(slug: string) {
    const profile = this.store.profiles.find((item) => item.slug === slug);
    if (!profile) return null;
    // Mirrors RLS: only authors with a published article are publicly visible.
    const isPublished = this.store.articles.some(
      (article) => article.authorId === profile.id && isPubliclyVisible(scheduleOf(article)),
    );
    return isPublished ? { ...profile } : null;
  }

  async getProfile(userId: string) {
    const profile = this.store.profiles.find((item) => item.id === userId);
    return profile ? { ...profile } : null;
  }

  async updateProfile(userId: string, input: ProfileInput): Promise<AuthorProfile> {
    const profile = this.store.profiles.find((item) => item.id === userId);
    if (!profile) throw new DomainError("Το προφίλ δεν βρέθηκε.", "not_found");
    if (this.store.profiles.some((item) => item.slug === input.slug && item.id !== userId)) {
      throw new DomainError("Αυτό το slug χρησιμοποιείται ήδη.", "conflict");
    }
    Object.assign(profile, input);
    return { ...profile };
  }
}

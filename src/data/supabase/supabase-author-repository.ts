import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorRepository } from "@/data/authors/author-repository";
import { toDomainError } from "@/data/supabase/supabase-errors";
import type { AuthorProfile, ProfileInput } from "@/domain/authors";
import { publiclyVisibleFilter } from "@/data/supabase/visibility";

type ProfileRow = { id: string; slug: string; display_name: string; bio: string | null };

const PROFILE_COLUMNS = "id, slug, display_name, bio";

const toProfile = (row: ProfileRow): AuthorProfile => ({
  id: row.id,
  slug: row.slug,
  displayName: row.display_name,
  bio: row.bio ?? "",
});

export class SupabaseAuthorRepository implements AuthorRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findPublicBySlug(slug: string) {
    const { data, error } = await this.client
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    // Members can read every member profile; the public page still requires a published article.
    const { count, error: countError } = await this.client
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("author_id", data.id)
      .or(publiclyVisibleFilter());
    if (countError) throw countError;
    return count ? toProfile(data as ProfileRow) : null;
  }

  async getProfile(userId: string) {
    const { data, error } = await this.client
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? toProfile(data as ProfileRow) : null;
  }

  async updateProfile(userId: string, input: ProfileInput) {
    const { data, error } = await this.client
      .from("profiles")
      .update({ display_name: input.displayName, slug: input.slug, bio: input.bio || null })
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw toDomainError(error, "Αυτό το slug χρησιμοποιείται ήδη.");
    return toProfile(data as ProfileRow);
  }
}

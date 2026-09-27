import { getMyProfile, getPublicAuthor, updateMyProfile } from "@/functions/authors";
import type { ProfileInput } from "@/domain/authors";

/** Isomorphic entry point; every call runs on the server. */
export const authorApi = {
  findPublicBySlug: (slug: string) => getPublicAuthor({ data: slug }),
  getMyProfile: () => getMyProfile(),
  updateMyProfile: (input: ProfileInput) => updateMyProfile({ data: input }),
};

import { z } from "zod";
import { isSlug } from "@/lib/slug";

/** What an article needs to know about its author. `slug` is null for anonymous/team bylines. */
export type AuthorRef = { slug: string | null; name: string };

export type AuthorProfile = {
  id: string;
  slug: string;
  displayName: string;
  bio: string;
};

export const editorialTeam: AuthorRef = { slug: null, name: "Συντακτική ομάδα" };

export const profileInputSchema = z
  .object({
    displayName: z.string().trim().min(1, "Το όνομα είναι υποχρεωτικό.").max(100),
    slug: z.string().refine(isSlug, "Μόνο λατινικά πεζά, αριθμοί και παύλες."),
    bio: z.string().trim().max(1000),
  })
  .strict();

export type ProfileInput = z.infer<typeof profileInputSchema>;

export function parseProfileInput(input: unknown): ProfileInput {
  return profileInputSchema.parse(input);
}

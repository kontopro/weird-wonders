import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseProfileInput, type ProfileInput } from "@/domain/authors";
import { DomainError } from "@/domain/errors";
import { requireMember } from "@/server/auth";
import { getRepositories } from "@/server/repositories";

const slugSchema = z.string().trim().min(1).max(200);

export const getPublicAuthor = createServerFn({ method: "GET" })
  .validator((slug: string) => slugSchema.parse(slug))
  .handler(({ data: slug }) => getRepositories().authors.findPublicBySlug(slug));

export const getMyProfile = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireMember();
  const profile = await getRepositories().authors.getProfile(user.id);
  if (!profile) throw new DomainError("Το προφίλ δεν βρέθηκε.", "not_found");
  return { profile, email: user.email, role: user.role };
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator((input: ProfileInput) => parseProfileInput(input))
  .handler(async ({ data }) => {
    const user = await requireMember();
    return getRepositories().authors.updateProfile(user.id, data);
  });

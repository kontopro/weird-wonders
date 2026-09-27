import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { subscribeInputSchema, type SubscribeInput } from "@/domain/newsletter";
import { requireMember } from "@/server/auth";
import { getRepositories } from "@/server/repositories";

const tokenSchema = z.string().trim().min(1).max(100);
/** Subscribers are personal data: owners and admins only. */
const listManagers = ["owner", "admin"] as const;

/** Public sign-up; always answers the same way. */
export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .validator((input: SubscribeInput) => subscribeInputSchema.parse(input))
  .handler(async ({ data }) => {
    await getRepositories().newsletter.subscribe(data);
  });

export const confirmNewsletter = createServerFn({ method: "POST" })
  .validator((token: string) => tokenSchema.parse(token))
  .handler(({ data }) => getRepositories().newsletter.confirm(data));

export const unsubscribeNewsletter = createServerFn({ method: "POST" })
  .validator((token: string) => tokenSchema.parse(token))
  .handler(({ data }) => getRepositories().newsletter.unsubscribe(data));

export const listSubscribers = createServerFn({ method: "GET" }).handler(async () => {
  await requireMember(listManagers);
  return getRepositories().newsletter.list();
});

export const removeSubscriber = createServerFn({ method: "POST" })
  .validator((id: string) => z.string().min(1).max(100).parse(id))
  .handler(async ({ data }) => {
    await requireMember(listManagers);
    await getRepositories().newsletter.remove(data);
  });

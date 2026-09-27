import type { SubscribeInput } from "@/domain/newsletter";
import {
  confirmNewsletter,
  listSubscribers,
  removeSubscriber,
  subscribeToNewsletter,
  unsubscribeNewsletter,
} from "@/functions/newsletter";

/** Isomorphic entry point; every call runs on the server. */
export const newsletterApi = {
  subscribe: (input: SubscribeInput) => subscribeToNewsletter({ data: input }),
  confirm: (token: string) => confirmNewsletter({ data: token }),
  unsubscribe: (token: string) => unsubscribeNewsletter({ data: token }),
  list: () => listSubscribers(),
  remove: (id: string) => removeSubscriber({ data: id }),
};

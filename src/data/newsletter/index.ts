import type { SubscribeInput } from "@/domain/newsletter";
import {
  confirmNewsletter,
  getEmailProvider,
  listDemoOutbox,
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
  /** Demo mode only: the e-mails that would have been sent. */
  demoOutbox: () => listDemoOutbox(),
  emailProvider: () => getEmailProvider(),
  remove: (id: string) => removeSubscriber({ data: id }),
};

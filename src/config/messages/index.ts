import { el, type SiteMessages } from "./el";
import { en } from "./en";

/** Message files by language code. A language listed in `siteConfig.languages` needs one here. */
export const messages: Record<string, SiteMessages> = { el, en };

export type { SiteMessages };

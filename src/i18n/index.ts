import { useParams } from "@tanstack/react-router";
import { messages, type SiteMessages } from "@/config/messages";
import { mainLanguage, siteConfig } from "@/config/site";

export { absoluteUrl, localizedPath } from "@/i18n/paths";

export function isSiteLanguage(value: unknown): value is string {
  return typeof value === "string" && siteConfig.languages.includes(value);
}

export function messagesFor(language: string): SiteMessages {
  return messages[language] ?? messages[mainLanguage]!;
}

/** Messages in the main language (admin screens and fallbacks). */
export const mainMessages = messagesFor(mainLanguage);

/** The `{-$lang}` route param for a language: omitted for the main language. */
export function langParam(language: string): string | undefined {
  return language === mainLanguage ? undefined : language;
}

/** Language of the current public page. */
export function useLang(): string {
  const params = useParams({ strict: false }) as { lang?: string };
  return isSiteLanguage(params.lang) ? params.lang : mainLanguage;
}

/** Messages for the current public page. */
export function useT(): SiteMessages {
  return messagesFor(useLang());
}

/** Formats an ISO date (`YYYY-MM-DD`) in a language, independent of the server time zone. */
export function formatDate(dateValue: string, language: string): string {
  return new Intl.DateTimeFormat(messagesFor(language).locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

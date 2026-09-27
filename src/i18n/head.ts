import { mainLanguage, siteConfig } from "@/config/site";
import { absoluteUrl, localizedPath } from "@/i18n";

/** Language of a route from its `{-$lang}` param. */
export const langOf = (params: { lang?: string | undefined }) => params.lang ?? mainLanguage;

/**
 * `hreflang` alternates and the canonical URL for a page that exists in the
 * given languages (by default every site language).
 */
export function alternateLinks(
  language: string,
  pathFor: (language: string) => string,
  languages: readonly string[] = siteConfig.languages,
) {
  return [
    { rel: "canonical", href: absoluteUrl(pathFor(language)) },
    ...languages.map((version) => ({
      rel: "alternate",
      hrefLang: version,
      href: absoluteUrl(pathFor(version)),
    })),
    ...(languages.includes(mainLanguage)
      ? [{ rel: "alternate", hrefLang: "x-default", href: absoluteUrl(pathFor(mainLanguage)) }]
      : []),
  ];
}

/** Alternates for a page with the same internal path in every language (home, lists…). */
export const sitewideAlternates = (language: string, internalPath: string) =>
  alternateLinks(language, (version) => localizedPath(version, internalPath));

import { messages, type SiteMessages } from "@/config/messages";
import { mainLanguage, siteConfig, siteUrl } from "@/config/site";

/**
 * Public URLs use each language's own words (`messages.<lang>.paths`), while
 * routes are defined once with internal names:
 *
 *   /arthro/ta-dentra        (main language, no prefix)  ↔ internal /arthro/ta-dentra
 *   /en/article/trees-talk   (other languages, prefixed) ↔ internal /en/arthro/trees-talk
 *
 * The router applies `toInternalPath` to incoming URLs and `toPublicPath` to
 * the links it renders (see `src/router.tsx`).
 */

type InternalSegment = keyof SiteMessages["paths"];

const prefixedLanguages = siteConfig.languages.filter((language) => language !== mainLanguage);

function splitLanguage(parts: string[]) {
  const [first] = parts;
  if (first && prefixedLanguages.includes(first)) return { language: first, index: 1 };
  return { language: mainLanguage, index: 0 };
}

function translateSegment(
  pathname: string,
  map: (paths: SiteMessages["paths"], segment: string) => string | undefined,
): string | null {
  const parts = pathname.split("/");
  // parts[0] is "" for absolute paths.
  const { language, index } = splitLanguage(parts.slice(1));
  const position = index + 1;
  const segment = parts[position];
  const paths = messages[language]?.paths;
  if (!segment || !paths) return null;
  const translated = map(paths, segment);
  if (!translated || translated === segment) return null;
  parts[position] = translated;
  return parts.join("/");
}

/** Public URL path → internal route path, or null when nothing changes. */
export function toInternalPath(pathname: string): string | null {
  return translateSegment(pathname, (paths, segment) =>
    (Object.keys(paths) as InternalSegment[]).find((key) => paths[key] === segment),
  );
}

/** Internal route path → public URL path, or null when nothing changes. */
export function toPublicPath(pathname: string): string | null {
  return translateSegment(pathname, (paths, segment) =>
    segment in paths ? paths[segment as InternalSegment] : undefined,
  );
}

/** Public path of an internal page in a language, e.g. ("en", "/arthro/x") → "/en/article/x". */
export function localizedPath(language: string, internalPath: string): string {
  const prefixed = language === mainLanguage ? internalPath : `/${language}${internalPath}`;
  const path = prefixed === `/${language}/` ? `/${language}` : prefixed;
  return toPublicPath(path) ?? path;
}

/** Absolute URL for canonical, hreflang, sitemap, feed and social links. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

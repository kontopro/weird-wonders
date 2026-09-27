import { mainLanguage, siteConfig } from "@/config/site";
import { absoluteUrl, localizedPath, messagesFor } from "@/i18n";
import { getRepositories } from "@/server/repositories";

/**
 * Machine-readable views of the public site: sitemap.xml, one RSS feed per
 * language and robots.txt. They read through the repositories, so they show
 * exactly what visitors can see (published articles only) in mock and
 * Supabase mode alike.
 */

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** Pages that exist in every language with the same internal path. */
const sitewidePages = ["/", "/anakalypse", "/katigories", "/dimofili", "/sxetika"] as const;

type SitemapUrl = {
  /** Public path per language version of the page. */
  versions: Record<string, string>;
  lastModified?: string;
};

function urlEntries({ versions, lastModified }: SitemapUrl): string[] {
  const languages = Object.keys(versions);
  const fallback = versions[mainLanguage];
  const alternates =
    languages.length > 1
      ? [
          ...languages.map(
            (language) =>
              `    <xhtml:link rel="alternate" hreflang="${language}" href="${escapeXml(absoluteUrl(versions[language]!))}"/>`,
          ),
          ...(fallback
            ? [
                `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(fallback))}"/>`,
              ]
            : []),
        ]
      : [];
  // Every version gets its own <url>, each listing all alternates (as Google expects).
  return languages.map((language) =>
    [
      "  <url>",
      `    <loc>${escapeXml(absoluteUrl(versions[language]!))}</loc>`,
      ...(lastModified ? [`    <lastmod>${lastModified}</lastmod>`] : []),
      ...alternates,
      "  </url>",
    ].join("\n"),
  );
}

/** Groups items that are versions of the same page by a shared key. */
function groupVersions<T>(
  items: T[],
  keyOf: (item: T) => string,
  languageOf: (item: T) => string,
  pathOf: (item: T) => string,
) {
  const groups = new Map<string, Record<string, string>>();
  for (const item of items) {
    const versions = groups.get(keyOf(item)) ?? {};
    versions[languageOf(item)] = pathOf(item);
    groups.set(keyOf(item), versions);
  }
  return [...groups.values()];
}

export async function buildSitemap(): Promise<string> {
  const { articles, taxonomy } = getRepositories();
  const languages = siteConfig.languages;
  const [index, categories, tags] = await Promise.all([
    articles.listPublicIndex(),
    Promise.all(languages.map((language) => taxonomy.listCategories(language))),
    Promise.all(languages.map((language) => taxonomy.listTags(language))),
  ]);

  const urls: SitemapUrl[] = [];

  // Home and list pages, in the languages that have published articles.
  const activeLanguages = languages.filter(
    (language) => language === mainLanguage || index.some((item) => item.language === language),
  );
  for (const page of sitewidePages) {
    urls.push({
      versions: Object.fromEntries(
        activeLanguages.map((language) => [language, localizedPath(language, page)]),
      ),
    });
  }

  // Articles: the versions of a piece are alternates of each other.
  const pieces = new Map<string, SitemapUrl>();
  for (const item of index) {
    const piece = pieces.get(item.translationGroupId) ?? { versions: {} };
    piece.versions[item.language] = localizedPath(item.language, `/arthro/${item.slug}`);
    const day = item.updatedAt.slice(0, 10);
    if (!piece.lastModified || day > piece.lastModified) piece.lastModified = day;
    pieces.set(item.translationGroupId, piece);
  }
  urls.push(...pieces.values());

  // Categories and tags with published articles in a language.
  const taxonomyPages = <T extends { id: string; slug: string; publishedCount: number }>(
    perLanguage: T[][],
    segment: string,
  ) =>
    groupVersions(
      perLanguage.flatMap((items, position) =>
        items
          .filter((item) => item.publishedCount > 0)
          .map((item) => ({ item, language: languages[position]! })),
      ),
      ({ item }) => item.id,
      ({ language }) => language,
      ({ item, language }) => localizedPath(language, `/${segment}/${item.slug}`),
    );
  for (const versions of taxonomyPages(categories, "katigoria")) urls.push({ versions });
  for (const versions of taxonomyPages(tags, "etiketa")) urls.push({ versions });

  // Authors with published articles, in the languages they write in.
  const authors = new Map<string, Set<string>>();
  for (const item of index) {
    if (!item.authorSlug) continue;
    const written = authors.get(item.authorSlug) ?? new Set<string>();
    written.add(item.language);
    authors.set(item.authorSlug, written);
  }
  for (const [slug, written] of authors) {
    urls.push({
      versions: Object.fromEntries(
        [...written].map((language) => [language, localizedPath(language, `/syntaktis/${slug}`)]),
      ),
    });
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls.flatMap(urlEntries),
    "</urlset>",
    "",
  ].join("\n");
}

/** Number of items in each RSS feed. */
export const feedSize = 20;

const rfc822 = (iso: string) => new Date(iso).toUTCString();

export async function buildRss(language: string): Promise<string> {
  const { articles } = getRepositories();
  const t = messagesFor(language);
  const items = await articles.listPublished({ language, limit: feedSize });
  const home = absoluteUrl(localizedPath(language, "/"));
  const self = absoluteUrl(localizedPath(language, "/rss.xml"));
  const newest = items.reduce<string | undefined>(
    (latest, item) => (!latest || item.updatedAt > latest ? item.updatedAt : latest),
    undefined,
  );

  const entries = items.map((item) => {
    const link = absoluteUrl(localizedPath(language, `/arthro/${item.slug}`));
    return [
      "    <item>",
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${rfc822(`${item.dateValue}T09:00:00Z`)}</pubDate>`,
      ...(item.excerpt ? [`      <description>${escapeXml(item.excerpt)}</description>`] : []),
      `      <dc:creator>${escapeXml(item.author.name)}</dc:creator>`,
      ...(item.category.slug
        ? [`      <category>${escapeXml(item.category.name)}</category>`]
        : []),
      ...(item.image
        ? [`      <media:content url="${escapeXml(absoluteUrl(item.image))}" medium="image"/>`]
        : []),
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">',
    "  <channel>",
    `    <title>${escapeXml(t.site.seo.title)}</title>`,
    `    <link>${escapeXml(home)}</link>`,
    `    <description>${escapeXml(t.site.seo.description)}</description>`,
    `    <language>${escapeXml(t.locale)}</language>`,
    `    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>`,
    ...(newest ? [`    <lastBuildDate>${rfc822(newest)}</lastBuildDate>`] : []),
    ...entries,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

/** Crawlers may read the public site; the admin and sign-in pages are private. */
export function buildRobots(): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /login",
    "Disallow: /auth/",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");
}

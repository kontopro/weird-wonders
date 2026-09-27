import { siteConfig } from "@/config/site";
import { absoluteUrl, localizedPath, messagesFor } from "@/i18n";

/**
 * Social previews (Open Graph, X/Twitter cards) and structured data
 * (schema.org JSON-LD) for public pages. Every URL is absolute and follows
 * `VITE_SITE_URL`.
 */

type SocialInput = {
  language: string;
  /** Title shown in the preview (the page's own title unless a social one is given). */
  title: string;
  description: string;
  /** Public path of the page, e.g. localizedPath(language, "/sxetika"). */
  path: string;
  /** Page image; defaults to the language's share image. */
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "profile";
  article?: {
    publishedTime: string;
    modifiedTime: string;
    section?: string;
    tags?: readonly string[];
    authorUrl?: string;
  };
};

const ogLocaleOf = (language: string) => messagesFor(language).locale.replace("-", "_");

/** Preview tags; the page sets its own `<title>` and `description`. */
export function socialMeta(input: SocialInput) {
  const { site } = messagesFor(input.language);
  const usesDefault = !input.image;
  const image = absoluteUrl(input.image || site.shareImage);
  const imageAlt = usesDefault ? site.shareImageAlt : input.imageAlt || input.title;
  return [
    { property: "og:site_name", content: siteConfig.name },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:url", content: absoluteUrl(input.path) },
    { property: "og:locale", content: ogLocaleOf(input.language) },
    ...siteConfig.languages
      .filter((language) => language !== input.language)
      .map((language) => ({ property: "og:locale:alternate", content: ogLocaleOf(language) })),
    { property: "og:image", content: image },
    { property: "og:image:alt", content: imageAlt },
    ...(usesDefault
      ? [
          { property: "og:image:width", content: "1200" },
          { property: "og:image:height", content: "630" },
        ]
      : []),
    ...(input.article
      ? [
          { property: "article:published_time", content: input.article.publishedTime },
          { property: "article:modified_time", content: input.article.modifiedTime },
          ...(input.article.section
            ? [{ property: "article:section", content: input.article.section }]
            : []),
          ...(input.article.authorUrl
            ? [{ property: "article:author", content: input.article.authorUrl }]
            : []),
          ...(input.article.tags ?? []).map((tag) => ({ property: "article:tag", content: tag })),
        ]
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: imageAlt },
  ];
}

/**
 * A `<script type="application/ld+json">` head entry. `<` is escaped so text
 * such as "</script>" inside a title cannot end the script early.
 */
export function jsonLd(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(
      /</g,
      "\\u003c",
    ),
  };
}

/** The blog as the publisher of its articles. */
export function publisher() {
  return {
    "@type": "Organization",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png"), width: 512, height: 512 },
  };
}

/** Breadcrumb trail, e.g. Home › Category › Article. */
export function breadcrumbs(items: ReadonlyArray<{ name: string; path: string }>) {
  return jsonLd({
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  });
}

/** The site itself, with its search (search engines may show a search box). */
export function websiteJsonLd(language: string) {
  const t = messagesFor(language);
  return jsonLd({
    "@type": "WebSite",
    name: siteConfig.name,
    description: t.site.seo.description,
    url: absoluteUrl(localizedPath(language, "/")),
    inLanguage: language,
    publisher: publisher(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(localizedPath(language, "/anakalypse"))}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
}

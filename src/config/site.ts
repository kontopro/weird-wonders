/**
 * The blog's structure: identity, domain and languages. Everything the site
 * *says* (tagline, SEO text, labels, URL words) lives per language in
 * `src/config/messages/`.
 */
export type SiteConfig = {
  id: string;
  name: string;
  wordmark: {
    primary: string;
    accent: string;
  };
  domain: string;
  /**
   * The blog's main language (BCP 47, e.g. "el", "en"). Articles are written in
   * it by default and public pages without a language prefix show it.
   */
  defaultLanguage: string;
  /**
   * Languages the blog publishes in, main language first. Translations are
   * linked articles (same `translationGroupId`); add e.g. "en" when a blog
   * starts publishing English versions.
   */
  languages: readonly string[];
  themeKey: string;
  layoutKey: string;
};

export const factakiSite = {
  id: "factaki",
  name: "FACTάκι",
  wordmark: {
    primary: "FACT",
    accent: "άκι",
  },
  domain: "factaki.gr",
  defaultLanguage: "el",
  languages: ["el", "en"],
  themeKey: "factaki",
  layoutKey: "editorial",
} satisfies SiteConfig;

// This repository remains FACTάκι. A new blog starts from the reusable starter
// and replaces this validated configuration without changing shared components.
export const siteConfig: SiteConfig = factakiSite;

export function brandedTitle(title: string) {
  return `${title} — ${siteConfig.name}`;
}

/** The blog's main language; see `SiteConfig.defaultLanguage`. */
export const mainLanguage = siteConfig.defaultLanguage;

/**
 * Public origin used for canonical, hreflang, sitemap, RSS and social links,
 * e.g. `https://factaki.gr`. Set `VITE_SITE_URL` per deployment (preview
 * URLs, a staging domain); defaults to `https://<domain>`.
 */
export const siteUrl = (
  (import.meta.env["VITE_SITE_URL"] as string | undefined) || `https://${siteConfig.domain}`
).replace(/\/+$/, "");

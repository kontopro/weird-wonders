export type SiteConfig = {
  id: string;
  name: string;
  wordmark: {
    primary: string;
    accent: string;
  };
  tagline: string;
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
  contentLabels: {
    singular: string;
    plural: string;
    /** Name of the one highlighted article shown on the homepage. */
    highlight: string;
  };
  seo: {
    title: string;
    description: string;
    socialTitle: string;
    socialDescription: string;
  };
};

export const factakiSite = {
  id: "factaki",
  name: "FACTάκι",
  wordmark: {
    primary: "FACT",
    accent: "άκι",
  },
  tagline: "Μικρό fact. Μεγάλη έκπληξη.",
  domain: "factaki.gr",
  defaultLanguage: "el",
  languages: ["el"],
  themeKey: "factaki",
  layoutKey: "editorial",
  contentLabels: {
    singular: "FACTάκι",
    plural: "FACTάκια",
    highlight: "FACTάκι της ημέρας",
  },
  seo: {
    title: "FACTάκι — Μικρό fact. Μεγάλη έκπληξη.",
    description:
      "Απρόσμενα και τεκμηριωμένα facts από την επιστήμη, την ιστορία, τη φύση, την τεχνολογία και τον πολιτισμό.",
    socialTitle: "FACTάκι — Κάθε μέρα κάτι που δεν ήξερες",
    socialDescription: "Μικρές πληροφορίες που κρύβουν μεγάλες εκπλήξεις.",
  },
} satisfies SiteConfig;

// This repository remains FACTάκι. A new blog starts from the reusable starter
// and replaces this validated configuration without changing shared components.
export const siteConfig: SiteConfig = factakiSite;

export function brandedTitle(title: string) {
  return `${title} — ${siteConfig.name}`;
}

/** The blog's main language; see `SiteConfig.defaultLanguage`. */
export const mainLanguage = siteConfig.defaultLanguage;

export type SiteConfig = {
  id: string;
  name: string;
  wordmark: {
    primary: string;
    accent: string;
  };
  tagline: string;
  domain: string;
  defaultLanguage: string;
  themeKey: string;
  layoutKey: string;
  contentLabels: {
    singular: string;
    plural: string;
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
  themeKey: "factaki",
  layoutKey: "editorial",
  contentLabels: {
    singular: "FACTάκι",
    plural: "FACTάκια",
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

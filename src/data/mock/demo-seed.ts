import type { ArticleContentDocument } from "@/lib/article-content";
import type { MockStore } from "@/data/mock/mock-store";

/**
 * Demo content for mock mode. Rows mirror the database tables (ids and foreign
 * keys included) so the mock adapter behaves like the real one.
 * Everything here is illustrative demo content, not real editorial material.
 */

// Demo images are static files in `public/demo`, registered as media assets.
const forest = "demo-forest";
const observatory = "demo-observatory";
const octopus = "demo-octopus";
const timeMachine = "demo-time-machine";

const demoMedia: MockStore["media"] = [
  ["demo-forest", "/demo/forest-network.jpg", 1600, 1008, 497124, "Δάσος με φωτεινό δίκτυο ριζών"],
  [
    "demo-observatory",
    "/demo/observatory.jpg",
    1200,
    912,
    184752,
    "Αστεροσκοπείο κάτω από έναστρο ουρανό",
  ],
  ["demo-octopus", "/demo/octopus.jpg", 1200, 912, 165659, "Χταπόδι σε μπλε νερά"],
  [
    "demo-time-machine",
    "/demo/time-machine.jpg",
    1200,
    912,
    162276,
    "Παλιό ρολόι και κυκλώματα υπολογιστή",
  ],
].map(([id, src, width, height, sizeBytes, alt]) => ({
  id: String(id),
  src: String(src),
  width: Number(width),
  height: Number(height),
  mimeType: "image/jpeg",
  sizeBytes: Number(sizeBytes),
  alt: String(alt),
  caption: "",
  uploadedBy: null,
  createdAt: "2026-09-01T00:00:00.000Z",
}));

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

const demoArticleContent: ArticleContentDocument = {
  version: 1,
  blocks: [
    {
      id: "2c1d8a23-7060-46e5-a50b-cf703c1e57f3",
      type: "paragraph",
      data: {
        text: "Κάτω από κάθε βήμα μας στο δάσος, λεπτά νήματα μυκήτων συναντούν τις ρίζες των δέντρων. Μαζί σχηματίζουν ένα εξαιρετικά σύνθετο οικοσύστημα.",
      },
    },
    {
      id: "1cfcc61c-f4bd-48e8-8c39-11c6e75f5554",
      type: "heading",
      data: { text: "Το κρυφό δίκτυο κάτω από το χώμα", level: 2 },
    },
    {
      id: "69fbbfb8-5013-448a-a66b-235f2ed3d6b7",
      type: "paragraph",
      data: {
        text: "Η **μυκόρριζα** είναι μια *συμβιωτική* σχέση ανάμεσα σε μύκητες και φυτά. Οι μύκητες βοηθούν τις ρίζες να απορροφήσουν νερό και θρεπτικά στοιχεία, ενώ λαμβάνουν άνθρακα από το φυτό. Η επιστημονική εικόνα είναι συναρπαστική — αλλά και πιο σύνθετη από τις δημοφιλείς μεταφορές περί «διαδικτύου του δάσους».",
      },
    },
    {
      id: "ddcf42b7-df41-4595-9b36-70ac1caf75cb",
      type: "quote",
      data: {
        text: "Το πιο ενδιαφέρον δεν είναι ότι το δάσος μοιάζει με κοινωνία. Είναι ότι λειτουργεί ως οικοσύστημα αλληλεξαρτήσεων.",
      },
    },
    {
      id: "51046515-e2d6-4742-a9a8-c9498263cadd",
      type: "heading",
      data: { text: "Σήματα, πόροι και ανταλλαγές", level: 2 },
    },
    {
      id: "68a81af2-708c-4359-a0e2-2e2c90a02a7a",
      type: "paragraph",
      data: {
        text: "Πειράματα έχουν δείξει μεταφορά άνθρακα και χημικών σημάτων μεταξύ φυτών σε συγκεκριμένες συνθήκες. Αυτό δεν σημαίνει ότι τα δέντρα “μιλούν” όπως οι άνθρωποι. Η λέξη επικοινωνία χρησιμοποιείται ως εύληπτη μεταφορά για βιολογικές διεργασίες.",
      },
    },
    {
      id: "61e0e519-c438-498c-8e83-0aaab0ab0490",
      type: "factBox",
      data: {
        title: "Κράτησέ το",
        text: "Ένα κουταλάκι υγιούς δασικού εδάφους μπορεί να περιέχει χιλιόμετρα μικροσκοπικών μυκητιακών νημάτων.",
      },
    },
    {
      id: "03c82a45-f3a6-4e4d-b8fc-9e1f20a44ff5",
      type: "heading",
      data: { text: "Τι γνωρίζουμε πραγματικά", level: 2 },
    },
    {
      id: "827342fc-2610-4547-9e98-72cd3551537b",
      type: "paragraph",
      data: {
        text: "Η έρευνα συνεχίζεται και αρκετοί ισχυρισμοί παραμένουν υπό συζήτηση. Γι’ αυτό ξεχωρίζουμε τις παρατηρήσεις από τις ερμηνείες και συνδέουμε κάθε δημοσιευμένο άρθρο με πρωτογενείς ή αξιόπιστες δευτερογενείς πηγές.",
      },
    },
  ],
  sources: [
    {
      title: "Net transfer of carbon between ectomycorrhizal tree species in the field",
      url: "https://doi.org/10.1038/41557",
      publisher: "Nature (Simard κ.ά.)",
      date: "1997",
    },
    {
      title:
        "Positive citation bias and overinterpreted results lead to misinformation on common mycorrhizal networks in forests",
      url: "https://doi.org/10.1038/s41559-023-01986-1",
      publisher: "Nature Ecology & Evolution (Karst κ.ά.)",
      date: "2023",
    },
  ],
};

const categoryRows: Array<Omit<MockStore["categories"][number], "description">> = [
  { id: "cat-epistimi", slug: "epistimi", name: "Επιστήμη", iconKey: "science", sortOrder: 10 },
  { id: "cat-istoria", slug: "istoria", name: "Ιστορία", iconKey: "history", sortOrder: 20 },
  {
    id: "cat-technologia",
    slug: "technologia",
    name: "Τεχνολογία",
    iconKey: "technology",
    sortOrder: 30,
  },
  { id: "cat-fysi", slug: "fysi", name: "Φύση", iconKey: "nature", sortOrder: 40 },
  { id: "cat-diastima", slug: "diastima", name: "Διάστημα", iconKey: "space", sortOrder: 50 },
  {
    id: "cat-politismos",
    slug: "politismos",
    name: "Πολιτισμός",
    iconKey: "culture",
    sortOrder: 60,
  },
  { id: "cat-anthropos", slug: "anthropos", name: "Άνθρωπος", iconKey: "human", sortOrder: 70 },
  {
    id: "cat-kathimerinotita",
    slug: "kathimerinotita",
    name: "Καθημερινότητα",
    iconKey: "daily",
    sortOrder: 80,
  },
];

const categories: MockStore["categories"] = categoryRows.map((category) => ({
  ...category,
  description: "Ιστορίες που αλλάζουν τον τρόπο που κοιτάς τον κόσμο.",
}));

const tags: MockStore["tags"] = [
  { id: "tag-oikosystimata", slug: "oikosystimata", name: "οικοσυστήματα" },
  { id: "tag-fos", slug: "fos", name: "φως" },
  { id: "tag-zoa", slug: "zoa", name: "ζώα" },
  { id: "tag-chronos", slug: "chronos", name: "χρόνος" },
  { id: "tag-imerologio", slug: "imerologio", name: "ημερολόγιο" },
  { id: "tag-mousiki", slug: "mousiki", name: "μουσική" },
  { id: "tag-egkefalos", slug: "egkefalos", name: "εγκέφαλος" },
  { id: "tag-aisthiseis", slug: "aisthiseis", name: "αισθήσεις" },
];

// English versions of the demo categories and tags (the site publishes in el + en).
const categoryTranslations: MockStore["categoryTranslations"] = [
  ["cat-epistimi", "Science", "science"],
  ["cat-istoria", "History", "history"],
  ["cat-technologia", "Technology", "technology"],
  ["cat-fysi", "Nature", "nature"],
  ["cat-diastima", "Space", "space"],
  ["cat-politismos", "Culture", "culture"],
  ["cat-anthropos", "Humans", "humans"],
  ["cat-kathimerinotita", "Everyday life", "everyday-life"],
].map(([categoryId, name, slug]) => ({
  categoryId: categoryId!,
  language: "en",
  name: name!,
  slug: slug!,
  description: "Stories that change the way you look at the world.",
}));

const tagTranslations: MockStore["tagTranslations"] = [
  ["tag-oikosystimata", "ecosystems", "ecosystems"],
  ["tag-fos", "light", "light"],
  ["tag-zoa", "animals", "animals"],
  ["tag-chronos", "time", "time"],
].map(([tagId, name, slug]) => ({
  tagId: tagId!,
  language: "en",
  name: name!,
  slug: slug!,
  description: "",
}));

const englishTreesContent: ArticleContentDocument = {
  version: 1,
  blocks: [
    {
      id: "5b0e7a1c-2d3f-4e5a-8b6c-7d8e9f0a1b2c",
      type: "paragraph",
      data: {
        text: "Beneath every step we take in a forest, fine fungal threads meet the roots of the trees. Together they form a remarkably complex ecosystem.",
      },
    },
    {
      id: "6c1f8b2d-3e4a-4f5b-9c7d-8e9f0a1b2c3d",
      type: "heading",
      data: { text: "The hidden network under the soil", level: 2 },
    },
    {
      id: "7d2a9c3e-4f5b-4a6c-8d8e-9f0a1b2c3d4e",
      type: "paragraph",
      data: {
        text: "**Mycorrhiza** is a *symbiotic* relationship between fungi and plants. The fungi help roots take up water and nutrients and receive carbon from the plant in return. The science is fascinating — and more complex than the popular “wood wide web” metaphors suggest.",
      },
    },
    {
      id: "8e3b0d4f-5a6c-4b7d-9e9f-0a1b2c3d4e5f",
      type: "factBox",
      data: {
        title: "Remember this",
        text: "A teaspoon of healthy forest soil can hold kilometres of microscopic fungal threads.",
      },
    },
  ],
  sources: demoArticleContent.sources ?? [],
};

const profiles: MockStore["profiles"] = [
  {
    id: DEMO_USER_ID,
    slug: "maria-papadopoulou",
    displayName: "Μαρία Παπαδοπούλου",
    bio: "Αρχισυντάκτρια. Γράφω για τις ιστορίες που κάνουν την επιστήμη να φαίνεται λίγο πιο κοντά.",
  },
  {
    id: "author-aris",
    slug: "aris-lymperis",
    displayName: "Άρης Λυμπέρης",
    bio: "Γράφει για το διάστημα και την αστρονομία.",
  },
  {
    id: "author-eva",
    slug: "eva-petrou",
    displayName: "Εύα Πέτρου",
    bio: "Βιολόγος, λατρεύει τα παράξενα πλάσματα της θάλασσας.",
  },
  {
    id: "author-nikos",
    slug: "nikos-arvanitis",
    displayName: "Νίκος Αρβανίτης",
    bio: "Μηχανικός λογισμικού με αδυναμία στην ιστορία της πληροφορικής.",
  },
  {
    id: "author-lida",
    slug: "lida-markou",
    displayName: "Λήδα Μάρκου",
    bio: "Ιστορικός, ψάχνει τις λεπτομέρειες που ξεχάστηκαν.",
  },
  {
    id: "author-iason",
    slug: "iason-vitas",
    displayName: "Ιάσων Βήτας",
    bio: "Μουσικός και αρθρογράφος πολιτισμού.",
  },
  {
    id: "author-danai",
    slug: "danai-riga",
    displayName: "Δανάη Ρήγα",
    bio: "Γράφει για τον ανθρώπινο εγκέφαλο και τη συμπεριφορά.",
  },
  {
    id: "author-marina",
    slug: "marina-theodorou",
    displayName: "Μαρίνα Θεοδώρου",
    bio: "Γράφει για τη φύση και την καθημερινή επιστήμη.",
  },
];

type SeedArticle = Pick<
  MockStore["articles"][number],
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "categoryId"
  | "authorId"
  | "tagIds"
  | "status"
  | "dateValue"
  | "coverAssetId"
  | "views"
  | "popularity"
  | "minutes"
>;

const seedArticles: SeedArticle[] = [
  {
    id: "1",
    slug: "ta-dentra-epikoinonoun",
    title: "Ήξερες ότι τα δέντρα επικοινωνούν μεταξύ τους;",
    excerpt:
      "Κάτω από το δάσος απλώνεται ένα αόρατο δίκτυο ανταλλαγής θρεπτικών στοιχείων και σημάτων.",
    categoryId: "cat-fysi",
    authorId: DEMO_USER_ID,
    tagIds: ["tag-oikosystimata"],
    status: "published",
    dateValue: "2026-09-18",
    coverAssetId: forest,
    views: 12480,
    popularity: 98,
    minutes: 7,
  },
  {
    id: "2",
    slug: "to-fos-koitazei-parelthon",
    title: "Κάθε ματιά στον ουρανό είναι ένα ταξίδι στο παρελθόν",
    excerpt: "Το φως χρειάζεται χρόνο για να φτάσει ως εμάς — μερικές φορές δισεκατομμύρια χρόνια.",
    categoryId: "cat-diastima",
    authorId: "author-aris",
    tagIds: ["tag-fos", "tag-chronos"],
    status: "published",
    dateValue: "2026-09-16",
    coverAssetId: observatory,
    views: 9210,
    popularity: 94,
    minutes: 5,
  },
  {
    id: "3",
    slug: "treis-kardies-ena-xrwma",
    title: "Το χταπόδι έχει τρεις καρδιές και μπλε αίμα",
    excerpt: "Μια εντελώς διαφορετική βιολογική αρχιτεκτονική κρύβεται κάτω από οκτώ πλοκάμια.",
    categoryId: "cat-epistimi",
    authorId: "author-eva",
    tagIds: ["tag-zoa"],
    status: "scheduled",
    dateValue: "2026-09-22",
    coverAssetId: octopus,
    views: 0,
    popularity: 91,
    minutes: 4,
  },
  {
    id: "4",
    slug: "rologia-kai-ypologistes",
    title: "Ο χρόνος στους υπολογιστές ξεκινά το 1970",
    excerpt:
      "Για πολλά ψηφιακά συστήματα, η ιστορία του κόσμου έχει μια πολύ συγκεκριμένη αφετηρία.",
    categoryId: "cat-technologia",
    authorId: "author-nikos",
    tagIds: ["tag-chronos"],
    status: "draft",
    dateValue: "2026-09-19",
    coverAssetId: timeMachine,
    views: 0,
    popularity: 87,
    minutes: 6,
  },
  {
    id: "5",
    slug: "h-poli-pou-allaxe-hmera",
    title: "Η πόλη που έχασε έντεκα ημέρες μέσα σε μία νύχτα",
    excerpt:
      "Όταν άλλαξε το ημερολόγιο, οι κάτοικοι κοιμήθηκαν στις 2 και ξύπνησαν στις 14 του μήνα.",
    categoryId: "cat-istoria",
    authorId: "author-lida",
    tagIds: ["tag-imerologio", "tag-chronos"],
    status: "published",
    dateValue: "2026-09-10",
    coverAssetId: observatory,
    views: 7860,
    popularity: 83,
    minutes: 8,
  },
  {
    id: "6",
    slug: "h-siopi-sth-mousiki",
    title: "Το μουσικό έργο που αποτελείται από τέσσερα λεπτά σιωπής",
    excerpt: "Όταν ο εκτελεστής δεν παίζει, οι ήχοι του χώρου γίνονται η ίδια η σύνθεση.",
    categoryId: "cat-politismos",
    authorId: "author-iason",
    tagIds: ["tag-mousiki"],
    status: "draft",
    dateValue: "2026-09-08",
    coverAssetId: timeMachine,
    views: 0,
    popularity: 79,
    minutes: 5,
  },
  {
    id: "7",
    slug: "giati-kollaei-to-xasmourito",
    title: "Γιατί το χασμουρητό είναι τόσο μεταδοτικό;",
    excerpt: "Η απάντηση ίσως συνδέεται περισσότερο με την ενσυναίσθηση παρά με την κούραση.",
    categoryId: "cat-anthropos",
    authorId: "author-danai",
    tagIds: ["tag-egkefalos"],
    status: "published",
    dateValue: "2026-09-06",
    coverAssetId: forest,
    views: 5120,
    popularity: 76,
    minutes: 4,
  },
  {
    id: "8",
    slug: "h-myrwdia-ths-vroxhs",
    title: "Η μυρωδιά της βροχής έχει το δικό της όνομα",
    excerpt: "Το πετριχώρ περιγράφει ένα από τα πιο αναγνωρίσιμα αρώματα της καθημερινότητάς μας.",
    categoryId: "cat-kathimerinotita",
    authorId: "author-marina",
    tagIds: ["tag-aisthiseis"],
    status: "published",
    dateValue: "2026-09-04",
    coverAssetId: forest,
    views: 4380,
    popularity: 72,
    minutes: 3,
  },
];

const demoSeed: MockStore = {
  categories,
  tags,
  categoryTranslations,
  tagTranslations,
  profiles,
  media: demoMedia,
  articleViews: [],
  slugHistory: [],
  subscribers: [],
  members: [
    { userId: DEMO_USER_ID, email: "maria@example.com", role: "owner", status: "active" },
    { userId: "author-aris", email: "aris@example.com", role: "editor", status: "active" },
    { userId: "author-eva", email: "eva@example.com", role: "author", status: "active" },
    { userId: "author-nikos", email: "nikos@example.com", role: "author", status: "active" },
    { userId: "author-lida", email: "lida@example.com", role: "author", status: "active" },
    { userId: "author-iason", email: "iason@example.com", role: "author", status: "suspended" },
  ],
  articles: seedArticles
    .map((article) => ({
      ...article,
      language: "el",
      translationGroupId: `group-${article.id}`,
      content: demoArticleContent satisfies ArticleContentDocument,
      imageAlt: demoMedia.find((media) => media.id === article.coverAssetId)?.alt ?? "",
      seoTitle: "",
      seoDescription: "",
      isFeatured: article.id === "1",
      isTrending: article.popularity > 80,
      isHighlighted: article.slug === "h-myrwdia-ths-vroxhs",
    }))
    .concat([
      // English translation of the trees article (same translation group).
      {
        id: "1-en",
        slug: "trees-talk-to-each-other",
        language: "en",
        translationGroupId: "group-1",
        title: "Did you know that trees communicate with each other?",
        excerpt:
          "Beneath the forest floor lies an invisible network that exchanges nutrients and signals.",
        categoryId: "cat-fysi",
        authorId: DEMO_USER_ID,
        tagIds: ["tag-oikosystimata"],
        status: "published",
        dateValue: "2026-09-19",
        coverAssetId: forest,
        imageAlt: "A forest with a glowing network of roots",
        content: englishTreesContent,
        seoTitle: "",
        seoDescription: "",
        isFeatured: true,
        isTrending: true,
        isHighlighted: false,
        views: 3120,
        popularity: 90,
        minutes: 3,
      },
    ]),
};

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Returns a fresh, independent copy of the demo data. Scheduled demo articles
 * are moved a week ahead of `now` so the demo always shows one pending article.
 */
export function createDemoStore(now: Date = new Date()): MockStore {
  const store = structuredClone(demoSeed);
  for (const article of store.articles) {
    if (article.status === "scheduled") article.dateValue = addDays(now, 7);
  }
  // Recent views so "popular" has something to rank: yesterday's count
  // follows the demo popularity score.
  store.articleViews = store.articles
    .filter((article) => article.status === "published" && article.popularity > 0)
    .map((article) => ({
      articleId: article.id,
      day: addDays(now, -1),
      views: article.popularity * 10,
    }));
  return store;
}

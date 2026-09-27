import type { ArticleContentDocument } from "@/lib/article-content";
import type { MockStore } from "@/data/mock/mock-store";

/**
 * Demo content for mock mode. Rows mirror the database tables (ids and foreign
 * keys included) so the mock adapter behaves like the real one.
 * Everything here is illustrative demo content, not real editorial material.
 */

// Demo images are static files in `public/demo`, served as-is.
const forest = "/demo/forest-network.jpg";
const observatory = "/demo/observatory.jpg";
const octopus = "/demo/octopus.jpg";
const timeMachine = "/demo/time-machine.jpg";

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
        text: "Η μυκόρριζα είναι μια συμβιωτική σχέση ανάμεσα σε μύκητες και φυτά. Οι μύκητες βοηθούν τις ρίζες να απορροφήσουν νερό και θρεπτικά στοιχεία, ενώ λαμβάνουν άνθρακα από το φυτό. Η επιστημονική εικόνα είναι συναρπαστική — αλλά και πιο σύνθετη από τις δημοφιλείς μεταφορές περί «διαδικτύου του δάσους».",
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
  | "image"
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
    status: "Δημοσιευμένο",
    dateValue: "2026-09-18",
    image: forest,
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
    status: "Δημοσιευμένο",
    dateValue: "2026-09-16",
    image: observatory,
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
    status: "Προγραμματισμένο",
    dateValue: "2026-09-22",
    image: octopus,
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
    status: "Πρόχειρο",
    dateValue: "2026-09-19",
    image: timeMachine,
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
    status: "Δημοσιευμένο",
    dateValue: "2026-09-10",
    image: observatory,
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
    status: "Πρόχειρο",
    dateValue: "2026-09-08",
    image: timeMachine,
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
    status: "Δημοσιευμένο",
    dateValue: "2026-09-06",
    image: forest,
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
    status: "Δημοσιευμένο",
    dateValue: "2026-09-04",
    image: forest,
    views: 4380,
    popularity: 72,
    minutes: 3,
  },
];

const demoSeed: MockStore = {
  categories,
  tags,
  profiles,
  members: [
    { userId: DEMO_USER_ID, role: "owner", status: "active" },
    { userId: "author-aris", role: "editor", status: "active" },
    { userId: "author-eva", role: "author", status: "active" },
    { userId: "author-nikos", role: "author", status: "active" },
    { userId: "author-lida", role: "author", status: "active" },
    { userId: "author-iason", role: "author", status: "suspended" },
  ],
  articles: seedArticles.map((article) => ({
    ...article,
    content: demoArticleContent satisfies ArticleContentDocument,
    imageAlt: "",
    seoTitle: "",
    seoDescription: "",
    isFeatured: article.id === "1",
    isTrending: article.popularity > 80,
    isFactOfDay: false,
  })),
};

/** Returns a fresh, independent copy of the demo data. */
export function createDemoStore(): MockStore {
  return structuredClone(demoSeed);
}

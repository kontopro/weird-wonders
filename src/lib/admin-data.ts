import type { Category } from "@/lib/articles";
import forest from "@/assets/forest-network.jpg";
import observatory from "@/assets/observatory.jpg";
import octopus from "@/assets/octopus.jpg";
import timeMachine from "@/assets/time-machine.jpg";

export const articleStatuses = [
  "Πρόχειρο",
  "Σε έλεγχο",
  "Προγραμματισμένο",
  "Δημοσιευμένο",
  "Αρχειοθετημένο",
] as const;

export type ArticleStatus = (typeof articleStatuses)[number];

export type AdminArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: Category;
  author: string;
  status: ArticleStatus;
  date: string;
  dateValue: string;
  views: number;
  image: string;
};

export const demoAdminArticles: AdminArticle[] = [
  {
    id: "1",
    slug: "ta-dentra-epikoinonoun",
    title: "Ήξερες ότι τα δέντρα επικοινωνούν μεταξύ τους;",
    excerpt: "Το αόρατο δίκτυο κάτω από το δάσος.",
    category: "Φύση",
    author: "Μαρία Παπαδοπούλου",
    status: "Δημοσιευμένο",
    date: "18 Σεπ 2026",
    dateValue: "2026-09-18",
    views: 12480,
    image: forest,
  },
  {
    id: "2",
    slug: "to-fos-koitazei-parelthon",
    title: "Κάθε ματιά στον ουρανό είναι ένα ταξίδι στο παρελθόν",
    excerpt: "Το φως ως χρονομηχανή του σύμπαντος.",
    category: "Διάστημα",
    author: "Άρης Λυμπέρης",
    status: "Δημοσιευμένο",
    date: "16 Σεπ 2026",
    dateValue: "2026-09-16",
    views: 9210,
    image: observatory,
  },
  {
    id: "3",
    slug: "treis-kardies-ena-xrwma",
    title: "Το χταπόδι έχει τρεις καρδιές και μπλε αίμα",
    excerpt: "Μια εντελώς διαφορετική βιολογική αρχιτεκτονική.",
    category: "Επιστήμη",
    author: "Εύα Πέτρου",
    status: "Προγραμματισμένο",
    date: "22 Σεπ 2026",
    dateValue: "2026-09-22",
    views: 0,
    image: octopus,
  },
  {
    id: "4",
    slug: "rologia-kai-ypologistes",
    title: "Ο χρόνος στους υπολογιστές ξεκινά το 1970",
    excerpt: "Η αφετηρία του ψηφιακού χρόνου.",
    category: "Τεχνολογία",
    author: "Νίκος Αρβανίτης",
    status: "Πρόχειρο",
    date: "19 Σεπ 2026",
    dateValue: "2026-09-19",
    views: 0,
    image: timeMachine,
  },
  {
    id: "5",
    slug: "h-poli-pou-allaxe-hmera",
    title: "Η πόλη που έχασε έντεκα ημέρες μέσα σε μία νύχτα",
    excerpt: "Μια παράξενη σελίδα στην ιστορία του ημερολογίου.",
    category: "Ιστορία",
    author: "Λήδα Μάρκου",
    status: "Δημοσιευμένο",
    date: "10 Σεπ 2026",
    dateValue: "2026-09-10",
    views: 7860,
    image: observatory,
  },
  {
    id: "6",
    slug: "h-siopi-sth-mousiki",
    title: "Το μουσικό έργο που αποτελείται από τέσσερα λεπτά σιωπής",
    excerpt: "Όταν οι ήχοι του χώρου γίνονται η σύνθεση.",
    category: "Πολιτισμός",
    author: "Ιάσων Βήτας",
    status: "Πρόχειρο",
    date: "8 Σεπ 2026",
    dateValue: "2026-09-08",
    views: 0,
    image: timeMachine,
  },
];

export const formatViews = (views: number) => views.toLocaleString("el-GR");

import forest from "@/assets/forest-network.jpg";
import observatory from "@/assets/observatory.jpg";
import octopus from "@/assets/octopus.jpg";
import timeMachine from "@/assets/time-machine.jpg";

export type Category = "Επιστήμη" | "Ιστορία" | "Τεχνολογία" | "Φύση" | "Διάστημα" | "Πολιτισμός" | "Άνθρωπος" | "Καθημερινότητα";
export type Article = { slug: string; category: Category; title: string; excerpt: string; date: string; minutes: number; image: string; popularity: number; author: string };

export const categoryStyles: Record<Category, string> = {
  Επιστήμη: "science", Ιστορία: "history", Τεχνολογία: "technology", Φύση: "nature",
  Διάστημα: "space", Πολιτισμός: "culture", Άνθρωπος: "human", Καθημερινότητα: "daily",
};

export const articles: Article[] = [
  { slug: "ta-dentra-epikoinonoun", category: "Φύση", title: "Ήξερες ότι τα δέντρα επικοινωνούν μεταξύ τους;", excerpt: "Κάτω από το δάσος απλώνεται ένα αόρατο δίκτυο ανταλλαγής θρεπτικών στοιχείων και σημάτων.", date: "18 Σεπ 2026", minutes: 7, image: forest, popularity: 98, author: "Μαρίνα Θεοδώρου" },
  { slug: "to-fos-koitazei-parelthon", category: "Διάστημα", title: "Κάθε ματιά στον ουρανό είναι ένα ταξίδι στο παρελθόν", excerpt: "Το φως χρειάζεται χρόνο για να φτάσει ως εμάς — μερικές φορές δισεκατομμύρια χρόνια.", date: "16 Σεπ 2026", minutes: 5, image: observatory, popularity: 94, author: "Άρης Λυμπέρης" },
  { slug: "treis-kardies-ena-xrwma", category: "Επιστήμη", title: "Το χταπόδι έχει τρεις καρδιές και μπλε αίμα", excerpt: "Μια εντελώς διαφορετική βιολογική αρχιτεκτονική κρύβεται κάτω από οκτώ πλοκάμια.", date: "14 Σεπ 2026", minutes: 4, image: octopus, popularity: 91, author: "Εύα Πέτρου" },
  { slug: "rologia-kai-ypologistes", category: "Τεχνολογία", title: "Ο χρόνος στους υπολογιστές ξεκινά το 1970", excerpt: "Για πολλά ψηφιακά συστήματα, η ιστορία του κόσμου έχει μια πολύ συγκεκριμένη αφετηρία.", date: "12 Σεπ 2026", minutes: 6, image: timeMachine, popularity: 87, author: "Νίκος Αρβανίτης" },
  { slug: "h-poli-pou-allaxe-hmera", category: "Ιστορία", title: "Η πόλη που έχασε έντεκα ημέρες μέσα σε μία νύχτα", excerpt: "Όταν άλλαξε το ημερολόγιο, οι κάτοικοι κοιμήθηκαν στις 2 και ξύπνησαν στις 14 του μήνα.", date: "10 Σεπ 2026", minutes: 8, image: observatory, popularity: 83, author: "Λήδα Μάρκου" },
  { slug: "h-siopi-sth-mousiki", category: "Πολιτισμός", title: "Το μουσικό έργο που αποτελείται από τέσσερα λεπτά σιωπής", excerpt: "Όταν ο εκτελεστής δεν παίζει, οι ήχοι του χώρου γίνονται η ίδια η σύνθεση.", date: "8 Σεπ 2026", minutes: 5, image: timeMachine, popularity: 79, author: "Ιάσων Βήτας" },
  { slug: "giati-kollaei-to-xasmourito", category: "Άνθρωπος", title: "Γιατί το χασμουρητό είναι τόσο μεταδοτικό;", excerpt: "Η απάντηση ίσως συνδέεται περισσότερο με την ενσυναίσθηση παρά με την κούραση.", date: "6 Σεπ 2026", minutes: 4, image: forest, popularity: 76, author: "Δανάη Ρήγα" },
  { slug: "h-myrwdia-ths-vroxhs", category: "Καθημερινότητα", title: "Η μυρωδιά της βροχής έχει το δικό της όνομα", excerpt: "Το πετριχώρ περιγράφει ένα από τα πιο αναγνωρίσιμα αρώματα της καθημερινότητάς μας.", date: "4 Σεπ 2026", minutes: 3, image: forest, popularity: 72, author: "Μαρίνα Θεοδώρου" },
];

export const categories = Object.keys(categoryStyles) as Category[];
import forest from "@/assets/forest-network.jpg";
import observatory from "@/assets/observatory.jpg";
import octopus from "@/assets/octopus.jpg";
import timeMachine from "@/assets/time-machine.jpg";
import type { ArticleContentDocument } from "@/lib/article-content";

export type Category = "Επιστήμη" | "Ιστορία" | "Τεχνολογία" | "Φύση" | "Διάστημα" | "Πολιτισμός" | "Άνθρωπος" | "Καθημερινότητα";
export type Article = { slug: string; category: Category; title: string; excerpt: string; date: string; minutes: number; image: string; popularity: number; author: string };

export const demoArticleContent: ArticleContentDocument = {
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

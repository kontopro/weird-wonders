import type { AuthorRef } from "@/domain/authors";
import type { CategoryRef } from "@/domain/taxonomy";

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
  category: CategoryRef;
  author: AuthorRef;
  status: ArticleStatus;
  date: string;
  dateValue: string;
  views: number;
  image: string;
};

export const formatViews = (views: number) => views.toLocaleString("el-GR");

import type { AuthorRef } from "@/domain/authors";
import type { CategoryRef, TagRef } from "@/domain/taxonomy";

/** A published article as shown on public pages. */
export type Article = {
  id: string;
  slug: string;
  /** BCP 47 language of this version, e.g. "el". */
  language: string;
  title: string;
  excerpt: string;
  /** Display date in the main language (admin). Public pages format `dateValue` per language. */
  date: string;
  /** ISO date (`YYYY-MM-DD`). */
  dateValue: string;
  /** ISO date-time of the last change (feeds, structured data). */
  updatedAt: string;
  minutes: number;
  /** Cover image URL ("" when the article has none). */
  image: string;
  imageAlt: string;
  /** Views in the last `popularWindowDays` days. */
  popularity: number;
  category: CategoryRef;
  author: AuthorRef;
  tags: TagRef[];
  /** Lead story on the homepage (the newest article when none is featured). */
  isFeatured: boolean;
  /** The single highlighted article (e.g. "article of the day"). */
  isHighlighted: boolean;
};

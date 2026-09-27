import type { AuthorRef } from "@/domain/authors";
import type { CategoryRef, TagRef } from "@/domain/taxonomy";

/** A published article as shown on public pages. */
export type Article = {
  slug: string;
  /** BCP 47 language of this version, e.g. "el". */
  language: string;
  title: string;
  excerpt: string;
  date: string;
  minutes: number;
  /** Cover image URL ("" when the article has none). */
  image: string;
  imageAlt: string;
  popularity: number;
  category: CategoryRef;
  author: AuthorRef;
  tags: TagRef[];
  /** Lead story on the homepage (the newest article when none is featured). */
  isFeatured: boolean;
  /** The single highlighted article (e.g. "article of the day"). */
  isHighlighted: boolean;
};

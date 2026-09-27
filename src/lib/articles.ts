import type { AuthorRef } from "@/domain/authors";
import type { CategoryRef, TagRef } from "@/domain/taxonomy";

/** A published article as shown on public pages. */
export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  minutes: number;
  image: string;
  popularity: number;
  category: CategoryRef;
  author: AuthorRef;
  tags: TagRef[];
};

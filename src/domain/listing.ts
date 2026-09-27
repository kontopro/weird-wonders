/** Pagination, search and popularity rules shared by every adapter. */

export const defaultPageSize = 12;
export const maxPageSize = 50;
/** "Popular" means most viewed in this many recent days. */
export const popularWindowDays = 30;

export type Page<T> = {
  items: T[];
  total: number;
  /** 1-based. */
  page: number;
  pageSize: number;
  pageCount: number;
};

export function clampPage(page: number | undefined) {
  return Number.isInteger(page) && page! > 0 ? page! : 1;
}

export function pageOf<T>(all: readonly T[], page: number, pageSize = defaultPageSize): Page<T> {
  const size = Math.min(Math.max(pageSize, 1), maxPageSize);
  const current = clampPage(page);
  return {
    items: all.slice((current - 1) * size, current * size),
    total: all.length,
    page: current,
    pageSize: size,
    pageCount: Math.max(1, Math.ceil(all.length / size)),
  };
}

/** Builds a page from one slice plus the total count (database adapters). */
export function pageFrom<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/**
 * Lower-case text without accents, like `private.search_text` in the
 * database ("Δέντρα" → "δεντρα").
 */
export function searchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Words of a query; each must match the start of a word (prefix search). */
export function searchTerms(query: string): string[] {
  return searchText(query)
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
}

/** True when every term starts some word of the text (mirrors the tsquery `term:*`). */
export function matchesSearch(text: string, terms: readonly string[]): boolean {
  if (terms.length === 0) return false;
  const words = searchText(text).split(/[^\p{L}\p{N}]+/u);
  return terms.every((term) => words.some((word) => word.startsWith(term)));
}

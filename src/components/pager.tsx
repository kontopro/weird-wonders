import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Page } from "@/domain/listing";
import { useT } from "@/i18n";

/** Previous/next links that keep the current URL and change only `?page=`. */
export function Pager({ page }: { page: Pick<Page<unknown>, "page" | "pageCount"> }) {
  const t = useT();
  if (page.pageCount <= 1) return null;
  const to = (target: number) => ({
    to: "." as const,
    search: (previous: Record<string, unknown>) => ({
      ...previous,
      page: target > 1 ? target : undefined,
    }),
  });
  return (
    <nav className="pager" aria-label={t.pager.label}>
      {page.page > 1 ? (
        <Link {...to(page.page - 1)} rel="prev">
          <ChevronLeft aria-hidden="true" /> {t.pager.previous}
        </Link>
      ) : (
        <span />
      )}
      <span>{t.pager.pageOf(page.page, page.pageCount)}</span>
      {page.page < page.pageCount ? (
        <Link {...to(page.page + 1)} rel="next">
          {t.pager.next} <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

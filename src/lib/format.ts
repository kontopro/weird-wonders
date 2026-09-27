const articleDateFormat = new Intl.DateTimeFormat("el-GR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Formats an ISO date (`YYYY-MM-DD`) for display, independent of the server time zone. */
export function formatArticleDate(dateValue: string) {
  return articleDateFormat.format(new Date(`${dateValue}T12:00:00`));
}

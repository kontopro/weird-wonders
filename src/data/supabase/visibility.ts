/**
 * PostgREST filter for "publicly visible" articles, matching
 * `isPubliclyVisible` in `src/domain/publishing.ts` and the RLS policies.
 */
export function publiclyVisibleFilter(now: Date = new Date()) {
  return `status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${now.toISOString()})`;
}

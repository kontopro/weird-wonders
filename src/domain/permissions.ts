import type { MemberRole } from "@/lib/auth-types";
import type { ArticleStatus } from "@/lib/admin-data";

/**
 * Role rules shared by every data adapter and the UI. They mirror the
 * database RLS policies so mock mode behaves like production; in Supabase
 * mode the database enforces them again.
 */
export const editorRoles: readonly MemberRole[] = ["owner", "admin", "editor"];
export const authorEditableStatuses: readonly ArticleStatus[] = ["draft", "in_review"];

export function isEditorRole(role: MemberRole) {
  return editorRoles.includes(role);
}

/** Authors may only work on their own drafts or articles in review. */
export function canEditArticle(
  actor: { id: string; role: MemberRole },
  article: { authorId: string | null; status: ArticleStatus },
) {
  if (isEditorRole(actor.role)) return true;
  return article.authorId === actor.id && authorEditableStatuses.includes(article.status);
}

export function canManageTaxonomy(role: MemberRole) {
  return isEditorRole(role);
}

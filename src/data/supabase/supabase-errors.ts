import { DomainError } from "@/domain/errors";

type PostgrestLikeError = { code?: string; message?: string };

/**
 * Translates expected Postgres/PostgREST failures into user-facing domain
 * errors, so the UI shows the same messages in mock and Supabase mode.
 */
export function toDomainError(error: PostgrestLikeError, conflictMessage: string): Error {
  switch (error.code) {
    case "23505":
      return new DomainError(conflictMessage, "conflict");
    case "42501":
      return new DomainError("Δεν έχεις δικαίωμα για αυτή την ενέργεια.", "forbidden");
    case "PGRST116":
      return new DomainError("Η εγγραφή δεν βρέθηκε.", "not_found");
    default:
      return new Error(error.message ?? "Database error");
  }
}

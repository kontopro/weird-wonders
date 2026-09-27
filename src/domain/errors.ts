/** An expected, user-facing failure (validation, conflict, permission). Safe to show. */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "conflict" | "forbidden" | "invalid" = "invalid",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

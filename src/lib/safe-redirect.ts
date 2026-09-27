const DEFAULT_REDIRECT = "/admin";

/**
 * Accepts only same-origin relative paths so the login `redirect` parameter
 * cannot be used as an open redirect (e.g. `//evil.example` or `https://…`).
 */
export function safeRedirectPath(value: unknown, fallback = DEFAULT_REDIRECT): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Reject control characters, which some browsers strip before resolving URLs.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

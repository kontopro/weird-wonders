/**
 * Security headers for every response of the production server (see
 * `src/server.ts`). The development server is left alone: Vite's hot reload
 * needs inline scripts and websockets.
 *
 * `script-src` allows inline scripts because the framework writes its page
 * data (and the dark-mode script) inline; everything else is limited to this
 * site, Supabase Storage and the two video players.
 */

/** Video players that article embeds may load (see `src/lib/video-embed.ts`). */
const framedPlayers = ["https://www.youtube-nocookie.com", "https://player.vimeo.com"];

function supabaseOrigin(): string | null {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(): string {
  const supabase = supabaseOrigin();
  const extra = supabase ? ` ${supabase}` : "";
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${extra}`,
    // Vite inlines the smallest font files as data: URLs.
    "font-src 'self' data:",
    `connect-src 'self'${extra}`,
    `frame-src ${framedPlayers.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(request: Request): Record<string, string> {
  const https =
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  return {
    "content-security-policy": contentSecurityPolicy(),
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "cross-origin-opener-policy": "same-origin",
    // Browsers ignore HSTS over plain http (e.g. localhost), so send it on https only.
    ...(https ? { "strict-transport-security": "max-age=31536000" } : {}),
  };
}

/** Returns the response with the security headers added (without overriding any set). */
export function withSecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders(request))) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

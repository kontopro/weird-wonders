import { createHash } from "node:crypto";
import { getRequestIP } from "@tanstack/react-start/server";

/**
 * Small in-memory limits for public actions (sign-in, newsletter sign-up,
 * view counting). Counters live in this server instance's memory, keyed by a
 * hash of the visitor's IP address, and are never stored or logged.
 *
 * On serverless hosting each instance counts separately, so this slows down
 * abuse rather than stopping a determined attacker; the database adds hard
 * limits where they matter (see `claim_newsletter_confirmation`). For a busy
 * site, back `hit` with a shared store (e.g. Upstash Redis) instead.
 */

type Counter = { count: number; resetAt: number };

const counters = new Map<string, Counter>();
const maxCounters = 50_000;

/** Named limits: `limit` actions per `windowMs` for each visitor. */
export const rateLimits = {
  /** Failed sign-ins only. */
  signIn: { limit: 10, windowMs: 10 * 60_000 },
  subscribe: { limit: 5, windowMs: 10 * 60_000 },
  newsletterLink: { limit: 20, windowMs: 10 * 60_000 },
  views: { limit: 120, windowMs: 10 * 60_000 },
  /** The same article counts once per visitor in this window. */
  viewPerArticle: { limit: 1, windowMs: 30 * 60_000 },
} as const;
export type RateLimitName = keyof typeof rateLimits;

function forgetExpired(now: number) {
  for (const [key, counter] of counters) {
    if (counter.resetAt <= now) counters.delete(key);
  }
}

/** Counts one action; false when the visitor is over the limit. */
export function hit(name: RateLimitName, visitor: string, scope = "", now = Date.now()): boolean {
  const { limit, windowMs } = rateLimits[name];
  const key = `${name}:${visitor}:${scope}`;
  const counter = counters.get(key);
  if (!counter || counter.resetAt <= now) {
    if (counters.size >= maxCounters) forgetExpired(now);
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  counter.count += 1;
  return counter.count <= limit;
}

/** True when the visitor has used up the limit (without counting an action). */
export function isLimited(name: RateLimitName, visitor: string, scope = "", now = Date.now()) {
  const counter = counters.get(`${name}:${visitor}:${scope}`);
  return Boolean(counter && counter.resetAt > now && counter.count >= rateLimits[name].limit);
}

/** Clears all counters (tests). */
export function resetRateLimits() {
  counters.clear();
}

/**
 * A stable, anonymous key for the current visitor. Behind Vercel the
 * `X-Forwarded-For` header is set by the platform and can be trusted;
 * elsewhere only the connection address is used.
 */
export function visitorKey(): string {
  const ip = getRequestIP({ xForwardedFor: Boolean(process.env["VERCEL"]) }) ?? "unknown";
  return createHash("sha256").update(ip).digest("base64url").slice(0, 22);
}

/** Convenience for server functions: counts one action for the current visitor. */
export function allow(name: RateLimitName, scope = ""): boolean {
  return hit(name, visitorKey(), scope);
}

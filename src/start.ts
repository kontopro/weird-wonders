import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { isNotFound, isRedirect } from "@tanstack/react-router";
import { DomainError } from "./domain/errors";
import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/**
 * Server functions return expected errors (validation, permissions, "not
 * found") as they are; anything unexpected (a database or provider error)
 * is logged on the server and reaches the browser as a generic message, so
 * table names, SQL and provider details never leak.
 */
const hideUnexpectedErrors = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    const expected =
      error instanceof DomainError ||
      isRedirect(error) ||
      isNotFound(error) ||
      // By name: AuthorizationError lives in server-only code.
      (error instanceof Error && ["AuthorizationError", "ZodError"].includes(error.name));
    if (expected) throw error;
    console.error(error);
    // No `cause`: it would carry the original error to the browser.
    // eslint-disable-next-line preserve-caught-error
    throw new Error("Κάτι πήγε στραβά. Δοκίμασε ξανά σε λίγο.");
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
  functionMiddleware: [hideUnexpectedErrors],
}));

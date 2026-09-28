/** A message that is safe and useful to show in a toast. */
export function errorMessage(error: unknown, fallback = "Κάτι πήγε στραβά. Δοκίμασε ξανά.") {
  if (!(error instanceof Error) || !error.message) return fallback;
  // Validation errors (Zod) carry their issues as JSON: show the first message.
  if (error.name === "ZodError") {
    const issues = (error as Error & { issues?: Array<{ message?: string }> }).issues;
    if (issues?.[0]?.message) return issues[0].message;
    try {
      const parsed = JSON.parse(error.message) as Array<{ message?: string }>;
      return parsed[0]?.message ?? fallback;
    } catch {
      return fallback;
    }
  }
  return error.message;
}

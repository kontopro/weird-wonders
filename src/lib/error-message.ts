/** A message that is safe and useful to show in a toast. */
export function errorMessage(error: unknown, fallback = "Κάτι πήγε στραβά. Δοκίμασε ξανά.") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

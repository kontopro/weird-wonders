import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { errorMessage } from "@/lib/error-message";

describe("errorMessage", () => {
  test("shows a validation error's own message, not its JSON", () => {
    const result = z
      .object({ slug: z.string().min(3, "Πολύ μικρό slug.") })
      .safeParse({ slug: "a" });
    expect(errorMessage(result.error)).toBe("Πολύ μικρό slug.");
    // As it arrives from a server function: a plain Error named ZodError.
    const serialized = Object.assign(new Error(result.error!.message), { name: "ZodError" });
    expect(errorMessage(serialized)).toBe("Πολύ μικρό slug.");
  });

  test("other errors keep their message; non-errors get the fallback", () => {
    expect(errorMessage(new Error("Όχι."))).toBe("Όχι.");
    expect(errorMessage("x", "Προεπιλογή")).toBe("Προεπιλογή");
  });
});

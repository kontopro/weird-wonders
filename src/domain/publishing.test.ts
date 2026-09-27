import { describe, expect, test } from "bun:test";
import { effectiveStatus, isPubliclyVisible, scheduledAtFor } from "@/domain/publishing";

const now = new Date("2026-09-27T10:00:00.000Z");

describe("scheduled publishing", () => {
  test("a scheduled article is hidden before its day and public from its day on", () => {
    const tomorrow = { status: "scheduled" as const, scheduledAt: scheduledAtFor("2026-09-28") };
    const today = { status: "scheduled" as const, scheduledAt: scheduledAtFor("2026-09-27") };
    expect(isPubliclyVisible(tomorrow, now)).toBe(false);
    expect(isPubliclyVisible(today, now)).toBe(true);
    expect(effectiveStatus(tomorrow, now)).toBe("scheduled");
    expect(effectiveStatus(today, now)).toBe("published");
  });

  test("only published and due scheduled articles are public", () => {
    expect(isPubliclyVisible({ status: "published", scheduledAt: null }, now)).toBe(true);
    expect(isPubliclyVisible({ status: "draft", scheduledAt: null }, now)).toBe(false);
    expect(isPubliclyVisible({ status: "scheduled", scheduledAt: null }, now)).toBe(false);
    expect(isPubliclyVisible({ status: "archived", scheduledAt: "2020-01-01" }, now)).toBe(false);
  });
});

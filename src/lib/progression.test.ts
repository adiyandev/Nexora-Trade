import { describe, expect, it } from "vitest";
import { getProgressionLevel, gradeQuizAnswer, getUtcDayKey } from "./progression";

describe("progression levels", () => {
  it("starts at level one and advances every 100 XP", () => {
    expect(getProgressionLevel(0)).toBe(1);
    expect(getProgressionLevel(99)).toBe(1);
    expect(getProgressionLevel(100)).toBe(2);
    expect(getProgressionLevel(299)).toBe(3);
    expect(getProgressionLevel(300)).toBe(4);
  });

  it("safely handles invalid totals", () => {
    expect(getProgressionLevel(-1)).toBe(1);
    expect(getProgressionLevel(Number.NaN)).toBe(1);
    expect(getProgressionLevel(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("lesson quiz grading", () => {
  it("grades correct and incorrect choices", () => {
    expect(gradeQuizAnswer(1, 1, 3)).toBe(true);
    expect(gradeQuizAnswer(0, 1, 3)).toBe(false);
  });

  it("rejects answers outside the quiz options", () => {
    expect(gradeQuizAnswer(-1, 1, 3)).toBeNull();
    expect(gradeQuizAnswer(3, 1, 3)).toBeNull();
    expect(gradeQuizAnswer(1.5, 1, 3)).toBeNull();
  });

  it("rejects malformed quiz configuration", () => {
    expect(gradeQuizAnswer(0, 0, 1)).toBeNull();
    expect(gradeQuizAnswer(0, 4, 3)).toBeNull();
  });
});

describe("UTC daily mission boundaries", () => {
  it("uses UTC calendar dates regardless of local timezone", () => {
    expect(getUtcDayKey(new Date("2026-10-22T00:00:00.000Z"))).toBe("2026-10-22");
    expect(getUtcDayKey(new Date("2026-10-22T23:59:59.999Z"))).toBe("2026-10-22");
    expect(getUtcDayKey(new Date("2026-10-23T00:00:00.000Z"))).toBe("2026-10-23");
  });

  it("rejects invalid timestamps", () => {
    expect(() => getUtcDayKey(Number.NaN)).toThrow("Invalid date");
  });
});

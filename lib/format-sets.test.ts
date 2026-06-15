import { describe, it, expect } from "vitest";
import { formatSetDetails, getSetDetailsVolume } from "@/lib/format-sets";
import type { SetDetail } from "@/lib/supabase/types";

const set = (weight: number | null, reps: number | null, n = 1): SetDetail => ({
  set_number: n,
  weight,
  reps,
});

describe("formatSetDetails", () => {
  it("formats sets as 'WxR' joined by commas with a trailing unit", () => {
    const details = [set(26, 15, 1), set(30, 15, 2), set(30, 20, 3)];
    expect(formatSetDetails(details)).toBe("26x15, 30x15, 30x20 kg");
  });

  it("honors a custom weight unit", () => {
    expect(formatSetDetails([set(135, 5)], "lb")).toBe("135x5 lb");
  });

  it("returns an empty string for empty or missing input", () => {
    expect(formatSetDetails([])).toBe("");
    // @ts-expect-error testing the null guard at runtime
    expect(formatSetDetails(null)).toBe("");
  });

  it("renders missing weight or reps as '?'", () => {
    expect(formatSetDetails([set(null, 12), set(40, null)])).toBe(
      "?x12, 40x? kg"
    );
  });
});

describe("getSetDetailsVolume", () => {
  it("sums weight * reps across sets", () => {
    const details = [set(26, 15), set(30, 15), set(30, 20)];
    // 26*15 + 30*15 + 30*20 = 390 + 450 + 600 = 1440
    expect(getSetDetailsVolume(details)).toBe(1440);
  });

  it("skips sets missing weight or reps", () => {
    const details = [set(50, 10), set(null, 10), set(40, null)];
    expect(getSetDetailsVolume(details)).toBe(500);
  });

  it("returns 0 for no sets", () => {
    expect(getSetDetailsVolume([])).toBe(0);
  });

  it("treats a zero weight as no contribution (falsy guard)", () => {
    // The code uses `if (s.weight && s.reps)`, so weight 0 is skipped entirely.
    expect(getSetDetailsVolume([set(0, 15), set(20, 5)])).toBe(100);
  });
});

import { describe, it, expect } from "vitest";
import { inferMuscleGroup } from "@/lib/muscle-groups";

describe("inferMuscleGroup", () => {
  it("maps common exercises to their muscle group (case-insensitive)", () => {
    expect(inferMuscleGroup("Bench Press")).toBe("Chest");
    expect(inferMuscleGroup("Incline Dumbbell Press")).toBe("Chest");
    expect(inferMuscleGroup("Back Squat")).toBe("Legs");
    expect(inferMuscleGroup("Romanian Deadlift")).toBe("Back");
    expect(inferMuscleGroup("Barbell Row")).toBe("Back");
    expect(inferMuscleGroup("Lateral Raise")).toBe("Shoulders");
    expect(inferMuscleGroup("Plank")).toBe("Core");
  });

  it("falls back to 'Other' when no keyword matches", () => {
    expect(inferMuscleGroup("Burpees")).toBe("Other");
    expect(inferMuscleGroup("")).toBe("Other");
  });

  it("returns the first matching keyword's group (insertion order)", () => {
    // "incline bench" contains both "bench" (Chest, defined first) and "incline"
    // (also Chest) — either way Chest. Use a name proving order matters:
    // "leg curl" contains "leg curl" -> Legs, and "curl" -> Arms; "leg curl"
    // appears before "curl" in MUSCLE_GROUPS, so Legs wins.
    expect(inferMuscleGroup("Seated Leg Curl")).toBe("Legs");
  });

  it("matches substrings inside longer names", () => {
    expect(inferMuscleGroup("Hammer Curl")).toBe("Arms"); // "hammer" matches first
    expect(inferMuscleGroup("Cable Tricep Pushdown")).toBe("Arms");
  });
});

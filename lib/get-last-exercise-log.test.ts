import { describe, it, expect } from "vitest";
import { getLastLogForExercise } from "@/lib/get-last-exercise-log";
import type { ExerciseLog, WorkoutSession } from "@/lib/supabase/types";

function log(name: string, weight: number): ExerciseLog {
  return {
    id: `log-${name}-${weight}`,
    user_id: "u1",
    session_id: "s1",
    exercise_name: name,
    category: "strength",
    sets: 3,
    reps: 10,
    weight,
    weight_unit: "kg",
    duration_minutes: null,
    distance_km: null,
    notes: null,
    order_index: 0,
    set_details: null,
    rpe: null,
    rir: null,
    logged_at: "2026-01-01T00:00:00Z",
  };
}

function session(id: string, logs: ExerciseLog[]): WorkoutSession {
  return {
    id,
    user_id: "u1",
    date: "2026-01-01",
    status: "completed",
    started_at: null,
    completed_at: null,
    notes: null,
    planned_exercises: null,
    created_at: "2026-01-01T00:00:00Z",
    exercise_logs: logs,
  };
}

describe("getLastLogForExercise", () => {
  it("returns the match from the earliest session in the array (most-recent-first order)", () => {
    // History is passed most-recent-first; the function returns the first hit,
    // so the newest "Bench Press" (weight 80) should win over the older one (60).
    const history = [
      session("recent", [log("Bench Press", 80)]),
      session("old", [log("Bench Press", 60)]),
    ];
    const result = getLastLogForExercise("Bench Press", history);
    expect(result?.weight).toBe(80);
  });

  it("matches exercise names case-insensitively", () => {
    const history = [session("s", [log("Barbell Squat", 100)])];
    expect(getLastLogForExercise("barbell squat", history)?.weight).toBe(100);
  });

  it("returns null when no session contains the exercise", () => {
    const history = [session("s", [log("Deadlift", 120)])];
    expect(getLastLogForExercise("Overhead Press", history)).toBeNull();
  });

  it("returns null for empty history", () => {
    expect(getLastLogForExercise("Bench Press", [])).toBeNull();
  });

  it("handles sessions with no exercise_logs property", () => {
    const bare = session("s", []);
    delete (bare as { exercise_logs?: unknown }).exercise_logs;
    expect(getLastLogForExercise("Bench Press", [bare])).toBeNull();
  });

  it("requires an exact name match, not a substring", () => {
    // "Bench" should not match a log named "Bench Press".
    const history = [session("s", [log("Bench Press", 80)])];
    expect(getLastLogForExercise("Bench", history)).toBeNull();
  });
});

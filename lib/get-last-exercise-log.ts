import type { ExerciseLog, WorkoutSession } from "@/lib/supabase/types";

/**
 * Find the most recent log for a given exercise name from workout history.
 * Searches through history (most recent first) with case-insensitive matching.
 */
export function getLastLogForExercise(
  exerciseName: string,
  history: WorkoutSession[]
): ExerciseLog | null {
  const nameLower = exerciseName.toLowerCase();

  for (const session of history) {
    const logs = session.exercise_logs || [];
    const match = logs.find(
      (log) => log.exercise_name.toLowerCase() === nameLower
    );
    if (match) return match;
  }

  return null;
}

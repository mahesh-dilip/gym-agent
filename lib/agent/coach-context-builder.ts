import { createClient } from "@/lib/supabase/server";
import { format, subDays } from "date-fns";
import type {
  WorkoutSession,
  Goal,
  ExerciseLog,
  UserPreferences,
  UserNote,
  UserProfile,
} from "@/lib/supabase/types";

export type CoachContext = {
  profile: UserProfile | null;
  notes: UserNote[];
  goals: Goal[];
  preferences: UserPreferences;
  workoutSummary: {
    totalSessions: number;
    avgPerWeek: number;
    mostTrained: { name: string; count: number }[];
    recentSessions: { date: string; exercises: string[] }[];
  };
};

export async function buildCoachContext(userId: string): Promise<CoachContext> {
  const supabase = await createClient();
  const today = new Date();
  const ninetyDaysAgo = format(subDays(today, 90), "yyyy-MM-dd");

  const [profileResult, notesResult, goalsResult, historyResult] =
    await Promise.all([
      supabase
        .from("user_profile")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("goals").select("*").eq("status", "active"),
      supabase
        .from("workout_sessions")
        .select("*, exercise_logs(*)")
        .gte("date", ninetyDaysAgo)
        .order("date", { ascending: false }),
    ]);

  const profile = profileResult.data as UserProfile | null;
  const notes = (notesResult.data as UserNote[]) || [];
  const goals = (goalsResult.data as Goal[]) || [];
  const history = (historyResult.data as WorkoutSession[]) || [];
  const preferences =
    (profile?.preferences as UserPreferences) || {};

  // Build workout summary
  const exerciseCounts = new Map<string, number>();
  for (const session of history) {
    for (const log of (session.exercise_logs || []) as ExerciseLog[]) {
      const name = log.exercise_name;
      exerciseCounts.set(name, (exerciseCounts.get(name) || 0) + 1);
    }
  }

  const mostTrained = [...exerciseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const weeks = 90 / 7;
  const avgPerWeek =
    history.length > 0 ? Math.round((history.length / weeks) * 10) / 10 : 0;

  const recentSessions = history.slice(0, 10).map((s) => ({
    date: s.date,
    exercises: ((s.exercise_logs || []) as ExerciseLog[]).map(
      (e) => e.exercise_name
    ),
  }));

  return {
    profile,
    notes,
    goals,
    preferences,
    workoutSummary: {
      totalSessions: history.length,
      avgPerWeek,
      mostTrained,
      recentSessions,
    },
  };
}

export function formatCoachContext(ctx: CoachContext): string {
  const profileSection = ctx.profile
    ? `  Name: ${ctx.profile.name || "Not set"}
  Goals context: ${ctx.profile.goals_context || "Not set"}`
    : "  No profile set up";

  const notesSection =
    ctx.notes.length > 0
      ? ctx.notes
          .map(
            (n) =>
              `  - [${n.category || "general"}] ${n.note}`
          )
          .join("\n")
      : "  No notes yet";

  const goalsSection =
    ctx.goals.length > 0
      ? ctx.goals
          .map(
            (g) =>
              `  - ${g.title} (${g.goal_type}): ${g.target || g.description}`
          )
          .join("\n")
      : "  No active goals";

  const prefParts: string[] = [];
  if (ctx.preferences.default_reps)
    prefParts.push(`  Default reps: ${ctx.preferences.default_reps}`);
  if (ctx.preferences.weight_unit)
    prefParts.push(`  Weight unit: ${ctx.preferences.weight_unit}`);
  const prefSection =
    prefParts.length > 0 ? prefParts.join("\n") : "  None set";

  const { workoutSummary: ws } = ctx;
  const mostTrainedStr =
    ws.mostTrained.length > 0
      ? ws.mostTrained
          .map((e) => `${e.name} (${e.count}x)`)
          .join(", ")
      : "No data";

  const recentStr =
    ws.recentSessions.length > 0
      ? ws.recentSessions
          .slice(0, 6)
          .map((s) => `  ${s.date}: ${s.exercises.join(", ") || "No exercises"}`)
          .join("\n")
      : "  No recent sessions";

  return `USER PROFILE:
${profileSection}

USER NOTES (things the user has told me):
${notesSection}

ACTIVE GOALS:
${goalsSection}

USER PREFERENCES:
${prefSection}

WORKOUT SUMMARY (last 90 days):
  Total sessions: ${ws.totalSessions}
  Avg sessions/week: ${ws.avgPerWeek}
  Most trained: ${mostTrainedStr}

RECENT SESSIONS:
${recentStr}`;
}

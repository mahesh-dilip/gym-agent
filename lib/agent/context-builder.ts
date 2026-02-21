import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { format, subDays } from "date-fns";
import type { WorkoutSession, Goal, ExerciseLog, RecoveryLog, SetDetail, UserPreferences } from "@/lib/supabase/types";
import { formatSetDetails } from "@/lib/format-sets";

export type AgentContext = {
  todayDate: string;
  sessionStatus: string;
  todayExercises: ExerciseLog[];
  todayRecovery: RecoveryLog[];
  recentHistory: WorkoutSession[];
  goals: Goal[];
  plannedExercises: unknown[] | null;
  preferences: UserPreferences;
};

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component context
          }
        },
      },
    }
  );
}

export async function buildAgentContext(): Promise<AgentContext> {
  const supabase = await getSupabase();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(today, 7), "yyyy-MM-dd");

  // Auto-complete stale sessions from previous days that were never ended
  await supabase
    .from("workout_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("status", "in_progress")
    .lt("date", todayStr);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [goalsResult, historyResult, sessionResult, profileResult] = await Promise.all([
    supabase.from("goals").select("*").eq("status", "active"),
    supabase
      .from("workout_sessions")
      .select("*, exercise_logs(*), recovery_logs(*)")
      .gte("date", sevenDaysAgo)
      .lt("date", todayStr)
      .order("date", { ascending: false }),
    supabase
      .from("workout_sessions")
      .select("*, exercise_logs(*), recovery_logs(*)")
      .eq("date", todayStr)
      .maybeSingle(),
    user
      ? supabase.from("user_profile").select("preferences").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const todaySession = sessionResult.data as WorkoutSession | null;
  const preferences = (profileResult.data?.preferences as UserPreferences) || {};

  return {
    todayDate: todayStr,
    sessionStatus: todaySession?.status || "not_started",
    todayExercises: (todaySession?.exercise_logs as ExerciseLog[]) || [],
    todayRecovery: (todaySession?.recovery_logs as RecoveryLog[]) || [],
    recentHistory: (historyResult.data as WorkoutSession[]) || [],
    goals: (goalsResult.data as Goal[]) || [],
    plannedExercises: todaySession?.planned_exercises || null,
    preferences,
  };
}

export function formatContextForPrompt(ctx: AgentContext): string {
  const exercisesSummary = ctx.todayExercises.length > 0
    ? ctx.todayExercises
        .map((e) => {
          if (e.set_details && e.set_details.length > 0) {
            const rpeNote = e.rpe ? ` (RPE ${e.rpe})` : "";
            return `  - ${e.exercise_name}: ${formatSetDetails(e.set_details as SetDetail[], e.weight_unit)}${rpeNote}`;
          }
          const parts = [e.exercise_name];
          if (e.sets) parts.push(`${e.sets} sets`);
          if (e.reps) parts.push(`${e.reps} reps`);
          if (e.weight) parts.push(`${e.weight}${e.weight_unit}`);
          if (e.duration_minutes) parts.push(`${e.duration_minutes} min`);
          if (e.distance_km) parts.push(`${e.distance_km} km`);
          if (e.rpe) parts.push(`RPE ${e.rpe}`);
          return `  - ${parts.join(" · ")}`;
        })
        .join("\n")
    : "  None yet";

  const recoverySummary = ctx.todayRecovery.length > 0
    ? ctx.todayRecovery
        .map((r) => `  - ${r.activity}: ${r.body_area || "general"} (${r.duration_minutes || "?"} min)`)
        .join("\n")
    : "  None yet";

  const historySummary = ctx.recentHistory.length > 0
    ? ctx.recentHistory
        .map((s) => {
          const exercises = (s.exercise_logs || [])
            .map((e) => e.exercise_name)
            .join(", ");
          return `  ${s.date}: ${exercises || "No exercises logged"}`;
        })
        .join("\n")
    : "  No recent sessions";

  const goalsSummary = ctx.goals.length > 0
    ? ctx.goals.map((g) => `  - ${g.title} (${g.goal_type}): ${g.target || g.description}`).join("\n")
    : "  No active goals";

  const planSummary = ctx.plannedExercises && Array.isArray(ctx.plannedExercises) && ctx.plannedExercises.length > 0
    ? (ctx.plannedExercises as Array<{ name: string; target_sets: number; notes?: string }>)
        .map((e) => `  - ${e.name} (${e.target_sets} sets)${e.notes ? ` — ${e.notes}` : ""}`)
        .join("\n")
    : "  No plan set";

  const prefParts: string[] = [];
  if (ctx.preferences.default_reps) prefParts.push(`  Default reps: ${ctx.preferences.default_reps}`);
  if (ctx.preferences.weight_unit) prefParts.push(`  Weight unit: ${ctx.preferences.weight_unit}`);
  const prefSummary = prefParts.length > 0 ? prefParts.join("\n") : "  None set";

  return `TODAY: ${ctx.todayDate}
SESSION STATUS: ${ctx.sessionStatus}

USER PREFERENCES:
${prefSummary}

PLANNED WORKOUT:
${planSummary}

EXERCISES DONE TODAY:
${exercisesSummary}

RECOVERY TODAY:
${recoverySummary}

RECENT HISTORY (last 7 days):
${historySummary}

ACTIVE GOALS:
${goalsSummary}`;
}

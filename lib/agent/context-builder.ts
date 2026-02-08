import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { format, subDays } from "date-fns";
import type { WorkoutSession, Goal, ExerciseLog, RecoveryLog } from "@/lib/supabase/types";

export type AgentContext = {
  todayDate: string;
  sessionStatus: string;
  todayExercises: ExerciseLog[];
  todayRecovery: RecoveryLog[];
  recentHistory: WorkoutSession[];
  goals: Goal[];
  plannedExercises: unknown[] | null;
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

  const [goalsResult, historyResult, sessionResult] = await Promise.all([
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
  ]);

  const todaySession = sessionResult.data as WorkoutSession | null;

  return {
    todayDate: todayStr,
    sessionStatus: todaySession?.status || "not_started",
    todayExercises: (todaySession?.exercise_logs as ExerciseLog[]) || [],
    todayRecovery: (todaySession?.recovery_logs as RecoveryLog[]) || [],
    recentHistory: (historyResult.data as WorkoutSession[]) || [],
    goals: (goalsResult.data as Goal[]) || [],
    plannedExercises: todaySession?.planned_exercises || null,
  };
}

export function formatContextForPrompt(ctx: AgentContext): string {
  const exercisesSummary = ctx.todayExercises.length > 0
    ? ctx.todayExercises
        .map((e) => {
          const parts = [e.exercise_name];
          if (e.sets) parts.push(`${e.sets} sets`);
          if (e.reps) parts.push(`${e.reps} reps`);
          if (e.weight) parts.push(`${e.weight}${e.weight_unit}`);
          if (e.duration_minutes) parts.push(`${e.duration_minutes} min`);
          if (e.distance_km) parts.push(`${e.distance_km} km`);
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

  return `TODAY: ${ctx.todayDate}
SESSION STATUS: ${ctx.sessionStatus}

EXERCISES DONE TODAY:
${exercisesSummary}

RECOVERY TODAY:
${recoverySummary}

RECENT HISTORY (last 7 days):
${historySummary}

ACTIVE GOALS:
${goalsSummary}`;
}

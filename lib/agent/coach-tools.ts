import { z } from "zod";
import { tool } from "ai";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates tools available in coach mode.
 * Includes log_note, set_goal, show_progress, exercise_info, suggest_workout, set_preference.
 * Does NOT include session tools (log_exercise, log_recovery, end_session, etc.)
 */
export function createCoachTools(userId: string) {
  return {
    log_note: tool({
      description:
        "Save a personal note about the user. Use when the user shares health info, preferences, goals, or observations about their training.",
      inputSchema: z.object({
        note: z.string().describe("The note content"),
        category: z
          .enum(["health", "preference", "goal", "observation"])
          .optional()
          .describe("Category of the note"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { error } = await supabase.from("user_notes").insert({
            user_id: userId,
            note: input.note,
            category: input.category || null,
          });

          if (error) {
            return { status: "error", message: "Failed to save note" };
          }
          return {
            status: "saved",
            note: input.note,
            category: input.category || "general",
          };
        } catch {
          return { status: "error", message: "Failed to save note" };
        }
      },
    }),

    suggest_workout: tool({
      description:
        "Suggest a workout plan. Use when the user asks for a training plan or what to do.",
      inputSchema: z.object({
        focus: z
          .string()
          .describe("Primary focus area, e.g. 'Lower Body & Chest'"),
        exercises: z
          .array(
            z.object({
              name: z.string().describe("Exercise name"),
              target_sets: z
                .number()
                .describe("Recommended number of sets"),
              notes: z.string().optional().describe("Any tips or notes"),
            })
          )
          .describe("List of exercises in the plan"),
        rationale: z
          .string()
          .describe("Brief explanation of why this plan makes sense"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const enriched = await Promise.all(
            input.exercises.map(async (ex) => {
              const { data: lastLog } = await supabase
                .from("exercise_logs")
                .select("sets, reps, weight, weight_unit, set_details")
                .eq("user_id", userId)
                .ilike("exercise_name", ex.name)
                .order("logged_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              return {
                ...ex,
                last_weight: lastLog?.weight ?? null,
                last_reps: lastLog?.reps ?? null,
                last_sets: lastLog?.sets ?? null,
                last_set_details: lastLog?.set_details ?? null,
                last_weight_unit: lastLog?.weight_unit ?? null,
              };
            })
          );
          return { ...input, exercises: enriched, status: "plan_shown" };
        } catch {
          return { ...input, status: "plan_shown" };
        }
      },
    }),

    set_goal: tool({
      description: "Set or update a fitness goal for the user",
      inputSchema: z.object({
        title: z.string().describe("Short goal title"),
        description: z.string().describe("Detailed description of the goal"),
        goal_type: z
          .enum([
            "posture",
            "strength",
            "endurance",
            "flexibility",
            "body_comp",
          ])
          .describe("Goal category"),
        target: z.string().describe("Specific target or milestone"),
      }),
      execute: async (input) => ({
        ...input,
        status: "pending_confirmation",
      }),
    }),

    show_progress: tool({
      description:
        "Show the user's progress history for a specific exercise.",
      inputSchema: z.object({
        exercise_name: z.string().describe("Exercise name to look up"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { data: logs } = await supabase
            .from("exercise_logs")
            .select(
              "exercise_name, sets, reps, weight, weight_unit, duration_minutes, distance_km, set_details, logged_at, workout_sessions!inner(date)"
            )
            .eq("user_id", userId)
            .ilike("exercise_name", `%${input.exercise_name}%`)
            .order("logged_at", { ascending: false })
            .limit(10);

          if (!logs || logs.length === 0) {
            return {
              status: "no_data",
              exercise_name: input.exercise_name,
              message: `No history found for ${input.exercise_name}`,
            };
          }

          const withWeight = logs.filter((l) => l.weight);
          const personalBest =
            withWeight.length > 0
              ? withWeight.reduce((best, l) =>
                  l.weight! > best.weight! ? l : best
                )
              : null;

          const history = logs.map((l) => ({
            date: (l.workout_sessions as unknown as { date: string }).date,
            sets: l.sets,
            reps: l.reps,
            weight: l.weight,
            weight_unit: l.weight_unit,
            duration_minutes: l.duration_minutes,
            distance_km: l.distance_km,
            set_details: l.set_details,
          }));

          return {
            status: "found",
            exercise_name: logs[0].exercise_name,
            total_sessions: logs.length,
            history,
            personal_best: personalBest
              ? {
                  weight: personalBest.weight,
                  weight_unit: personalBest.weight_unit,
                  reps: personalBest.reps,
                  date: (
                    personalBest.workout_sessions as unknown as {
                      date: string;
                    }
                  ).date,
                }
              : null,
          };
        } catch {
          return {
            status: "error",
            exercise_name: input.exercise_name,
            message: "Failed to load progress",
          };
        }
      },
    }),

    exercise_info: tool({
      description:
        "Show structured exercise information when the user asks about form, technique, or how to do an exercise.",
      inputSchema: z.object({
        exercise_name: z
          .string()
          .describe("Exercise name, properly capitalized"),
        category: z
          .enum(["strength", "cardio", "flexibility"])
          .describe("Exercise category"),
        primary_muscles: z
          .array(z.string())
          .describe("Primary muscles targeted"),
        secondary_muscles: z
          .array(z.string())
          .optional()
          .describe("Secondary muscles worked"),
        form_cues: z
          .array(z.string())
          .describe("3-4 key form cues for proper execution"),
        common_mistakes: z
          .array(z.string())
          .describe("2-3 common mistakes to avoid"),
        recommended_sets: z
          .number()
          .optional()
          .describe("Recommended sets"),
        recommended_reps: z
          .string()
          .optional()
          .describe("Recommended rep range"),
      }),
      execute: async (input) => ({ ...input, status: "displayed" }),
    }),

    set_preference: tool({
      description:
        "Save a user preference like default reps or weight unit.",
      inputSchema: z.object({
        key: z
          .enum(["default_reps", "weight_unit"])
          .describe("Preference key"),
        value: z
          .union([z.string(), z.number()])
          .describe("Preference value"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { data: profile } = await supabase
            .from("user_profile")
            .select("preferences")
            .eq("user_id", userId)
            .maybeSingle();

          const current =
            (profile?.preferences as Record<string, unknown>) || {};
          const updated = { ...current, [input.key]: input.value };

          const { error } = await supabase.from("user_profile").upsert(
            {
              user_id: userId,
              preferences: updated,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

          if (error) {
            return { status: "error", message: "Failed to save preference" };
          }
          return { status: "saved", key: input.key, value: input.value };
        } catch {
          return { status: "error", message: "Failed to save preference" };
        }
      },
    }),
  };
}

import { z } from "zod";
import { tool } from "ai";
import { createClient } from "@/lib/supabase/server";

const sharedTools = {
  log_exercise: tool({
    description:
      "Log a strength, cardio, or flexibility exercise the user performed. Returns the parsed data for user confirmation.",
    inputSchema: z.object({
      exercise_name: z.string().describe("Name of the exercise, properly capitalized"),
      category: z.enum(["strength", "cardio", "flexibility"]).describe("Exercise category"),
      sets: z.number().optional().describe("Number of sets performed"),
      reps: z.number().optional().describe("Reps per set"),
      weight: z.number().optional().describe("Weight used"),
      weight_unit: z.enum(["kg", "lbs"]).default("kg").describe("Weight unit"),
      duration_minutes: z.number().optional().describe("Duration in minutes for cardio/flexibility"),
      distance_km: z.number().optional().describe("Distance in km for cardio"),
      notes: z.string().optional().describe("Any additional notes"),
    }),
    execute: async (input) => ({ ...input, status: "pending_confirmation" }),
  }),

  log_recovery: tool({
    description:
      "Log a recovery activity like foam rolling, stretching, or using recovery equipment",
    inputSchema: z.object({
      activity: z.enum(["foam_rolling", "stretching", "vyper", "massage_gun", "other"]).describe("Type of recovery activity"),
      body_area: z.string().describe("Body area targeted, e.g. quads, upper_back, hamstrings"),
      duration_minutes: z.number().optional().describe("Duration in minutes"),
      equipment: z.string().optional().describe("Equipment used, e.g. vyper_3, foam_roller"),
      notes: z.string().optional(),
    }),
    execute: async (input) => ({ ...input, status: "pending_confirmation" }),
  }),

  suggest_workout: tool({
    description: "Suggest a workout plan for today. Use when the user asks what to do.",
    inputSchema: z.object({
      focus: z.string().describe("Primary focus area, e.g. 'Lower Body & Chest'"),
      exercises: z.array(
        z.object({
          name: z.string().describe("Exercise name"),
          target_sets: z.number().describe("Recommended number of sets"),
          notes: z.string().optional().describe("Any tips or notes"),
        })
      ).describe("List of exercises in the plan"),
      rationale: z.string().describe("Brief explanation of why this plan makes sense"),
    }),
    execute: async (input) => ({ ...input, status: "plan_shown" }),
  }),

  end_session: tool({
    description: "End the current workout session and show a summary",
    inputSchema: z.object({
      notes: z.string().optional().describe("Any session-level notes or summary"),
    }),
    execute: async (input) => ({ ...input, status: "session_ended" }),
  }),

  set_goal: tool({
    description: "Set or update a fitness goal for the user",
    inputSchema: z.object({
      title: z.string().describe("Short goal title"),
      description: z.string().describe("Detailed description of the goal"),
      goal_type: z.enum(["posture", "strength", "endurance", "flexibility", "body_comp"]).describe("Goal category"),
      target: z.string().describe("Specific target or milestone"),
    }),
    execute: async (input) => ({ ...input, status: "pending_confirmation" }),
  }),
};

export function createAgentTools(userId: string) {
  return {
    ...sharedTools,

    backfill_workout: tool({
      description:
        "Save a past workout to history. Use when the user provides exercises they did on a specific past date. This tool persists the data directly — no confirmation needed.",
      inputSchema: z.object({
        date: z.string().describe("Date in YYYY-MM-DD format"),
        exercises: z.array(
          z.object({
            exercise_name: z.string().describe("Exercise name, properly capitalized"),
            category: z.enum(["strength", "cardio", "flexibility"]).describe("Exercise category"),
            sets: z.number().optional().describe("Number of sets"),
            reps: z.number().optional().describe("Reps per set"),
            weight: z.number().optional().describe("Weight used"),
            weight_unit: z.enum(["kg", "lbs"]).default("kg").describe("Weight unit"),
            duration_minutes: z.number().optional().describe("Duration in minutes"),
            distance_km: z.number().optional().describe("Distance in km"),
            notes: z.string().optional().describe("Notes about this exercise"),
          })
        ).describe("List of exercises performed"),
        notes: z.string().optional().describe("Session-level notes"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();

          // Check if session already exists for this date
          const { data: existing } = await supabase
            .from("workout_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("date", input.date)
            .maybeSingle();

          let sessionId: string;

          if (existing) {
            sessionId = existing.id;
          } else {
            const { data: newSession, error } = await supabase
              .from("workout_sessions")
              .insert({
                user_id: userId,
                date: input.date,
                status: "completed",
                started_at: `${input.date}T09:00:00Z`,
                completed_at: `${input.date}T10:00:00Z`,
                notes: input.notes || null,
              })
              .select("id")
              .single();

            if (error || !newSession) {
              return { status: "error", message: "Failed to create session" };
            }
            sessionId = newSession.id;
          }

          // Insert exercise logs
          const exerciseRows = input.exercises.map((e, i) => ({
            user_id: userId,
            session_id: sessionId,
            exercise_name: e.exercise_name,
            category: e.category,
            sets: e.sets ?? null,
            reps: e.reps ?? null,
            weight: e.weight ?? null,
            weight_unit: e.weight_unit || "kg",
            duration_minutes: e.duration_minutes ?? null,
            distance_km: e.distance_km ?? null,
            notes: e.notes || null,
            order_index: i,
          }));

          const { error: logError } = await supabase
            .from("exercise_logs")
            .insert(exerciseRows);

          if (logError) {
            return { status: "error", message: "Failed to save exercises" };
          }

          return {
            status: "saved",
            date: input.date,
            exercise_count: input.exercises.length,
            exercises: input.exercises,
            notes: input.notes,
          };
        } catch {
          return { status: "error", message: "Failed to save workout" };
        }
      },
    }),
  };
}

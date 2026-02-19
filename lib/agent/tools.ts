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
      set_details: z
        .array(
          z.object({
            set_number: z.number().describe("Set number (1-based)"),
            weight: z.number().nullable().describe("Weight for this set"),
            reps: z.number().nullable().describe("Reps for this set"),
          })
        )
        .optional()
        .describe(
          "Per-set breakdown when sets vary in weight/reps. Only use when sets differ — if all sets are identical, use the scalar sets/reps/weight fields instead."
        ),
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

  exercise_info: tool({
    description:
      "Show structured exercise information when the user asks about form, technique, or how to do an exercise. Always use this tool instead of plain text for exercise questions.",
    inputSchema: z.object({
      exercise_name: z.string().describe("Exercise name, properly capitalized"),
      category: z.enum(["strength", "cardio", "flexibility"]).describe("Exercise category"),
      primary_muscles: z.array(z.string()).describe("Primary muscles targeted"),
      secondary_muscles: z.array(z.string()).optional().describe("Secondary muscles worked"),
      form_cues: z.array(z.string()).describe("3-4 key form cues for proper execution"),
      common_mistakes: z.array(z.string()).describe("2-3 common mistakes to avoid"),
      recommended_sets: z.number().optional().describe("Recommended sets for a working set"),
      recommended_reps: z.string().optional().describe("Recommended rep range, e.g. '8-12'"),
    }),
    execute: async (input) => ({ ...input, status: "displayed" }),
  }),
};

export function createAgentTools(userId: string) {
  return {
    ...sharedTools,

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

    set_preference: tool({
      description:
        "Save a user preference like default reps or weight unit. Use when the user says 'set my default reps to X' or similar.",
      inputSchema: z.object({
        key: z.enum(["default_reps", "weight_unit"]).describe("Preference key"),
        value: z.union([z.string(), z.number()]).describe("Preference value"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          // Get current preferences
          const { data: profile } = await supabase
            .from("user_profile")
            .select("preferences")
            .eq("user_id", userId)
            .maybeSingle();

          const current = (profile?.preferences as Record<string, unknown>) || {};
          const updated = { ...current, [input.key]: input.value };

          const { error } = await supabase
            .from("user_profile")
            .upsert(
              { user_id: userId, preferences: updated, updated_at: new Date().toISOString() },
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

    delete_exercise: tool({
      description:
        "Delete one or more logged exercises from today's session. Use when the user says to remove, delete, or undo an exercise.",
      inputSchema: z.object({
        exercise_name: z
          .string()
          .describe("Name of the exercise to delete (case-insensitive match)"),
        delete_all_matching: z
          .boolean()
          .default(true)
          .describe(
            "If true, delete ALL entries matching this name in today's session. If false, delete only the most recent one."
          ),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const today = new Date().toISOString().split("T")[0];

          const { data: session } = await supabase
            .from("workout_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("date", today)
            .maybeSingle();

          if (!session) {
            return {
              status: "error",
              exercise_name: input.exercise_name,
              message: "No active session found for today",
            };
          }

          const { data: exercises } = await supabase
            .from("exercise_logs")
            .select("id, exercise_name, sets, reps, weight, weight_unit, duration_minutes, set_details")
            .eq("session_id", session.id)
            .ilike("exercise_name", `%${input.exercise_name}%`)
            .order("logged_at", { ascending: false });

          if (!exercises || exercises.length === 0) {
            return {
              status: "not_found",
              exercise_name: input.exercise_name,
              message: `No exercise matching "${input.exercise_name}" found in today's session`,
            };
          }

          const toDelete = input.delete_all_matching
            ? exercises
            : [exercises[0]];
          const ids = toDelete.map((e) => e.id);

          const { error } = await supabase
            .from("exercise_logs")
            .delete()
            .in("id", ids);

          if (error) {
            return {
              status: "error",
              exercise_name: input.exercise_name,
              message: "Failed to delete exercises",
            };
          }

          return {
            status: "deleted",
            exercise_name: input.exercise_name,
            deleted_count: toDelete.length,
            deleted_exercises: toDelete,
            deleted_ids: ids,
          };
        } catch {
          return {
            status: "error",
            exercise_name: input.exercise_name,
            message: "Failed to delete",
          };
        }
      },
    }),

    edit_exercise: tool({
      description:
        "Edit/update an exercise already logged in today's session. Use when the user wants to correct sets, reps, weight, or other details on a previously logged exercise.",
      inputSchema: z.object({
        exercise_name: z
          .string()
          .describe("Name of the exercise to edit (case-insensitive match)"),
        sets: z.number().optional().describe("New number of sets"),
        reps: z.number().optional().describe("New reps per set"),
        weight: z.number().optional().describe("New weight"),
        weight_unit: z
          .enum(["kg", "lbs"])
          .optional()
          .describe("New weight unit"),
        duration_minutes: z
          .number()
          .optional()
          .describe("New duration in minutes"),
        distance_km: z
          .number()
          .optional()
          .describe("New distance in km"),
        notes: z.string().optional().describe("New notes"),
        set_details: z
          .array(
            z.object({
              set_number: z.number().describe("Set number (1-based)"),
              weight: z.number().nullable().describe("Weight for this set"),
              reps: z.number().nullable().describe("Reps for this set"),
            })
          )
          .optional()
          .describe("Updated per-set breakdown"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const today = new Date().toISOString().split("T")[0];

          const { data: session } = await supabase
            .from("workout_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("date", today)
            .maybeSingle();

          if (!session) {
            return {
              status: "error",
              exercise_name: input.exercise_name,
              message: "No active session found for today",
            };
          }

          const { data: exercises } = await supabase
            .from("exercise_logs")
            .select("*")
            .eq("session_id", session.id)
            .ilike("exercise_name", `%${input.exercise_name}%`)
            .order("logged_at", { ascending: false })
            .limit(1);

          if (!exercises || exercises.length === 0) {
            return {
              status: "not_found",
              exercise_name: input.exercise_name,
              message: `No exercise matching "${input.exercise_name}" found in today's session`,
            };
          }

          const exercise = exercises[0];
          const updates: Record<string, unknown> = {};
          if (input.sets !== undefined) updates.sets = input.sets;
          if (input.reps !== undefined) updates.reps = input.reps;
          if (input.weight !== undefined) updates.weight = input.weight;
          if (input.weight_unit !== undefined)
            updates.weight_unit = input.weight_unit;
          if (input.duration_minutes !== undefined)
            updates.duration_minutes = input.duration_minutes;
          if (input.distance_km !== undefined)
            updates.distance_km = input.distance_km;
          if (input.notes !== undefined) updates.notes = input.notes;
          if (input.set_details !== undefined)
            updates.set_details = input.set_details;

          if (Object.keys(updates).length === 0) {
            return {
              status: "error",
              exercise_name: input.exercise_name,
              message: "No fields to update",
            };
          }

          const { data: updated, error } = await supabase
            .from("exercise_logs")
            .update(updates)
            .eq("id", exercise.id)
            .select()
            .single();

          if (error || !updated) {
            return {
              status: "error",
              exercise_name: input.exercise_name,
              message: "Failed to update exercise",
            };
          }

          return {
            status: "updated",
            exercise_name: updated.exercise_name,
            exercise: updated,
          };
        } catch {
          return {
            status: "error",
            exercise_name: input.exercise_name,
            message: "Failed to update",
          };
        }
      },
    }),

    show_progress: tool({
      description:
        "Show the user's progress history for a specific exercise. Use when user asks about their progress, personal best, or history for an exercise.",
      inputSchema: z.object({
        exercise_name: z.string().describe("Exercise name to look up"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();

          const { data: logs } = await supabase
            .from("exercise_logs")
            .select("exercise_name, sets, reps, weight, weight_unit, duration_minutes, distance_km, set_details, logged_at, workout_sessions!inner(date)")
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

          // Find personal best (highest weight)
          const withWeight = logs.filter((l) => l.weight);
          const personalBest = withWeight.length > 0
            ? withWeight.reduce((best, l) => (l.weight! > best.weight! ? l : best))
            : null;

          // Build history entries
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
                  date: (personalBest.workout_sessions as unknown as { date: string }).date,
                }
              : null,
          };
        } catch {
          return { status: "error", exercise_name: input.exercise_name, message: "Failed to load progress" };
        }
      },
    }),

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
            set_details: z
              .array(
                z.object({
                  set_number: z.number().describe("Set number (1-based)"),
                  weight: z.number().nullable().describe("Weight for this set"),
                  reps: z.number().nullable().describe("Reps for this set"),
                })
              )
              .optional()
              .describe("Per-set breakdown when sets vary in weight/reps"),
          })
        ).describe("List of exercises performed"),
        notes: z.string().optional().describe("Session-level notes"),
      }),
      execute: async (input) => {
        try {
          // Validate: at least one exercise
          if (!input.exercises || input.exercises.length === 0) {
            return { status: "error", message: "No exercises provided" };
          }

          // Validate: date not in the future
          const today = new Date().toISOString().split("T")[0];
          if (input.date > today) {
            return { status: "error", message: "Cannot backfill a future date" };
          }

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

          // Remove existing exercise logs for this session to prevent duplicates
          await supabase
            .from("exercise_logs")
            .delete()
            .eq("session_id", sessionId);

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
            set_details: e.set_details ?? null,
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

    delete_session: tool({
      description:
        "Delete an entire workout session and all its logs (exercises, recovery). Use when the user wants to clear/delete today's session or a past session entirely.",
      inputSchema: z.object({
        date: z
          .string()
          .optional()
          .describe(
            "Date of the session to delete in YYYY-MM-DD format. Defaults to today if not specified."
          ),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const date = input.date || new Date().toISOString().split("T")[0];

          const { data: session } = await supabase
            .from("workout_sessions")
            .select("id, date, status")
            .eq("user_id", userId)
            .eq("date", date)
            .maybeSingle();

          if (!session) {
            return {
              status: "not_found",
              date,
              message: `No session found for ${date}`,
            };
          }

          // Delete exercise logs, recovery logs, then the session
          await supabase
            .from("exercise_logs")
            .delete()
            .eq("session_id", session.id);

          await supabase
            .from("recovery_logs")
            .delete()
            .eq("session_id", session.id);

          const { error } = await supabase
            .from("workout_sessions")
            .delete()
            .eq("id", session.id);

          if (error) {
            return {
              status: "error",
              date,
              message: "Failed to delete session",
            };
          }

          return {
            status: "deleted",
            date,
            session_id: session.id,
          };
        } catch {
          return {
            status: "error",
            date: input.date || "today",
            message: "Failed to delete session",
          };
        }
      },
    }),
  };
}

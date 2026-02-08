import { z } from "zod";
import { tool } from "ai";

export const agentTools = {
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
  }),

  end_session: tool({
    description: "End the current workout session and show a summary",
    inputSchema: z.object({
      notes: z.string().optional().describe("Any session-level notes or summary"),
    }),
  }),

  set_goal: tool({
    description: "Set or update a fitness goal for the user",
    inputSchema: z.object({
      title: z.string().describe("Short goal title"),
      description: z.string().describe("Detailed description of the goal"),
      goal_type: z.enum(["posture", "strength", "endurance", "flexibility", "body_comp"]).describe("Goal category"),
      target: z.string().describe("Specific target or milestone"),
    }),
  }),
};

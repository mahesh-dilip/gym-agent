export type WorkoutSession = {
  id: string;
  user_id: string;
  date: string;
  status: "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  planned_exercises: PlannedExercise[] | null;
  created_at: string;
  exercise_logs?: ExerciseLog[];
  recovery_logs?: RecoveryLog[];
};

export type SetDetail = {
  set_number: number;
  weight: number | null;
  reps: number | null;
  weight_unit?: string;
};

export type ExerciseLog = {
  id: string;
  user_id: string;
  session_id: string;
  exercise_name: string;
  category: "strength" | "cardio" | "flexibility";
  sets: number | null;
  reps: number | null;
  weight: number | null;
  weight_unit: string;
  duration_minutes: number | null;
  distance_km: number | null;
  notes: string | null;
  order_index: number | null;
  set_details: SetDetail[] | null;
  logged_at: string;
};

export type RecoveryLog = {
  id: string;
  user_id: string;
  session_id: string;
  activity: "foam_rolling" | "stretching" | "vyper" | "massage_gun" | "other";
  body_area: string | null;
  duration_minutes: number | null;
  equipment: string | null;
  notes: string | null;
  logged_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal_type: "posture" | "strength" | "endurance" | "flexibility" | "body_comp";
  target: string | null;
  status: "active" | "achieved" | "paused";
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  session_id: string | null;
  role: "user" | "assistant";
  content: string;
  tool_calls: unknown | null;
  model_used: string | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  user_id: string;
  name: string | null;
  goals_context: string | null;
  created_at: string;
  updated_at: string;
};

export type PlannedExercise = {
  name: string;
  target_sets: number;
  notes?: string;
};

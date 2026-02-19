import type {
  WorkoutSession,
  ExerciseLog,
  RecoveryLog,
  Goal,
  PlannedExercise,
  UserPreferences,
} from "@/lib/supabase/types";

export type SessionStatus = "not_started" | "in_progress" | "completed";

export type CurrentSession = {
  id: string | null;
  status: SessionStatus;
  startedAt: string | null;
  plannedExercises: PlannedExercise[];
  completedExercises: ExerciseLog[];
  completedRecovery: RecoveryLog[];
};

export type SharedState = {
  currentSession: CurrentSession;
  userGoals: Goal[];
  recentHistory: WorkoutSession[];
  preferences: UserPreferences;
  isLoading: boolean;
};

export type Action =
  | { type: "SET_SESSION"; payload: WorkoutSession }
  | { type: "LOG_EXERCISE"; payload: ExerciseLog }
  | { type: "LOG_RECOVERY"; payload: RecoveryLog }
  | { type: "END_SESSION"; payload: { completedAt: string; notes?: string } }
  | { type: "SET_PLAN"; payload: PlannedExercise[] }
  | { type: "SET_GOAL"; payload: Goal }
  | { type: "LOAD_CONTEXT"; payload: { session: WorkoutSession | null; goals: Goal[]; history: WorkoutSession[]; preferences?: UserPreferences } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "UPDATE_EXERCISE"; payload: ExerciseLog }
  | { type: "REMOVE_EXERCISES"; payload: string[] }
  | { type: "START_SESSION"; payload: WorkoutSession };

export const initialState: SharedState = {
  currentSession: {
    id: null,
    status: "not_started",
    startedAt: null,
    plannedExercises: [],
    completedExercises: [],
    completedRecovery: [],
  },
  userGoals: [],
  recentHistory: [],
  preferences: {},
  isLoading: true,
};

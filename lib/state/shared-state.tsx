"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import type { SharedState, Action } from "./types";
import { initialState } from "./types";
import type { WorkoutSession, ExerciseLog, RecoveryLog, Goal, UserPreferences } from "@/lib/supabase/types";

function sharedStateReducer(state: SharedState, action: Action): SharedState {
  switch (action.type) {
    case "LOAD_CONTEXT": {
      const { session, goals, history, preferences } = action.payload;
      return {
        ...state,
        isLoading: false,
        userGoals: goals,
        recentHistory: history,
        preferences: preferences || {},
        currentSession: session
          ? {
              id: session.id,
              status: session.status as "in_progress" | "completed",
              startedAt: session.started_at,
              plannedExercises: session.planned_exercises || [],
              completedExercises: session.exercise_logs || [],
              completedRecovery: session.recovery_logs || [],
            }
          : { ...initialState.currentSession },
      };
    }

    case "START_SESSION":
      return {
        ...state,
        currentSession: {
          id: action.payload.id,
          status: "in_progress",
          startedAt: action.payload.started_at,
          plannedExercises: action.payload.planned_exercises || [],
          completedExercises: [],
          completedRecovery: [],
        },
      };

    case "SET_SESSION":
      return {
        ...state,
        currentSession: {
          id: action.payload.id,
          status: action.payload.status as "in_progress" | "completed",
          startedAt: action.payload.started_at,
          plannedExercises: action.payload.planned_exercises || [],
          completedExercises: action.payload.exercise_logs || [],
          completedRecovery: action.payload.recovery_logs || [],
        },
      };

    case "LOG_EXERCISE":
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          completedExercises: [
            ...state.currentSession.completedExercises,
            action.payload,
          ],
        },
      };

    case "UPDATE_EXERCISE":
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          completedExercises: state.currentSession.completedExercises.map((e) =>
            e.id === action.payload.id ? action.payload : e
          ),
        },
      };

    case "REMOVE_EXERCISES":
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          completedExercises: state.currentSession.completedExercises.filter(
            (e) => !action.payload.includes(e.id)
          ),
        },
      };

    case "LOG_RECOVERY":
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          completedRecovery: [
            ...state.currentSession.completedRecovery,
            action.payload,
          ],
        },
      };

    case "SET_PLAN":
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          plannedExercises: action.payload,
        },
      };

    case "END_SESSION":
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          status: "completed",
        },
      };

    case "SET_GOAL":
      return {
        ...state,
        userGoals: [...state.userGoals.filter((g) => g.id !== action.payload.id), action.payload],
      };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    default:
      return state;
  }
}

type SharedStateContextType = {
  state: SharedState;
  dispatch: Dispatch<Action>;
  persistExercise: (exercise: Omit<ExerciseLog, "id" | "user_id" | "logged_at">) => Promise<ExerciseLog | null>;
  persistRecovery: (recovery: Omit<RecoveryLog, "id" | "user_id" | "logged_at">) => Promise<RecoveryLog | null>;
  persistGoal: (goal: Omit<Goal, "id" | "user_id" | "created_at" | "updated_at">) => Promise<Goal | null>;
  persistPlan: (exercises: Array<{ name: string; target_sets: number; notes?: string }>) => Promise<void>;
  ensureSession: () => Promise<string>;
  endSession: (notes?: string) => Promise<void>;
};

const SharedStateContext = createContext<SharedStateContextType | null>(null);

export function SharedStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sharedStateReducer, initialState);
  const supabase = createClient();

  // Hydrate state on mount
  useEffect(() => {
    async function hydrate() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = format(new Date(), "yyyy-MM-dd");
      const sevenDaysAgo = format(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      );

      const [goalsResult, historyResult, sessionResult, profileResult] = await Promise.all([
        supabase.from("goals").select("*").eq("status", "active"),
        supabase
          .from("workout_sessions")
          .select("*, exercise_logs(*), recovery_logs(*)")
          .gte("date", sevenDaysAgo)
          .order("date", { ascending: false }),
        supabase
          .from("workout_sessions")
          .select("*, exercise_logs(*), recovery_logs(*)")
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("user_profile")
          .select("preferences")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      dispatch({
        type: "LOAD_CONTEXT",
        payload: {
          session: sessionResult.data as WorkoutSession | null,
          goals: (goalsResult.data as Goal[]) || [],
          history: (historyResult.data as WorkoutSession[]) || [],
          preferences: (profileResult.data?.preferences as UserPreferences) || {},
        },
      });
    }

    hydrate();
  }, [supabase]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (state.currentSession.id) return state.currentSession.id;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const today = format(new Date(), "yyyy-MM-dd");

    // Check if a session already exists for today
    const { data: existing } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      dispatch({ type: "START_SESSION", payload: existing as WorkoutSession });
      return existing.id;
    }

    const { data: newSession, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user.id,
        date: today,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    dispatch({ type: "START_SESSION", payload: newSession as WorkoutSession });
    return newSession.id;
  }, [state.currentSession.id, supabase]);

  const persistExercise = useCallback(
    async (exercise: Omit<ExerciseLog, "id" | "user_id" | "logged_at">): Promise<ExerciseLog | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const sessionId = await ensureSession();

      const { data, error } = await supabase
        .from("exercise_logs")
        .insert({
          ...exercise,
          user_id: user.id,
          session_id: sessionId,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to persist exercise:", error);
        return null;
      }

      dispatch({ type: "LOG_EXERCISE", payload: data as ExerciseLog });
      return data as ExerciseLog;
    },
    [supabase, ensureSession]
  );

  const persistRecovery = useCallback(
    async (recovery: Omit<RecoveryLog, "id" | "user_id" | "logged_at">): Promise<RecoveryLog | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const sessionId = await ensureSession();

      const { data, error } = await supabase
        .from("recovery_logs")
        .insert({
          ...recovery,
          user_id: user.id,
          session_id: sessionId,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to persist recovery:", error);
        return null;
      }

      dispatch({ type: "LOG_RECOVERY", payload: data as RecoveryLog });
      return data as RecoveryLog;
    },
    [supabase, ensureSession]
  );

  const persistGoal = useCallback(
    async (goal: Omit<Goal, "id" | "user_id" | "created_at" | "updated_at">): Promise<Goal | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("goals")
        .insert({ ...goal, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error("Failed to persist goal:", error);
        return null;
      }

      dispatch({ type: "SET_GOAL", payload: data as Goal });
      return data as Goal;
    },
    [supabase]
  );

  const persistPlan = useCallback(
    async (exercises: Array<{ name: string; target_sets: number; notes?: string }>) => {
      const sessionId = await ensureSession();

      const { error } = await supabase
        .from("workout_sessions")
        .update({ planned_exercises: exercises })
        .eq("id", sessionId);

      if (error) {
        console.error("Failed to persist plan:", error);
        return;
      }

      dispatch({ type: "SET_PLAN", payload: exercises });
    },
    [supabase, ensureSession]
  );

  const endSession = useCallback(
    async (notes?: string) => {
      if (!state.currentSession.id) return;

      const { error } = await supabase
        .from("workout_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", state.currentSession.id);

      if (error) {
        console.error("Failed to end session:", error);
        return;
      }

      dispatch({
        type: "END_SESSION",
        payload: { completedAt: new Date().toISOString(), notes },
      });
    },
    [state.currentSession.id, supabase]
  );

  return (
    <SharedStateContext.Provider
      value={{
        state,
        dispatch,
        persistExercise,
        persistRecovery,
        persistGoal,
        persistPlan,
        ensureSession,
        endSession,
      }}
    >
      {children}
    </SharedStateContext.Provider>
  );
}

export function useSharedState() {
  const context = useContext(SharedStateContext);
  if (!context) {
    throw new Error("useSharedState must be used within SharedStateProvider");
  }
  return context;
}

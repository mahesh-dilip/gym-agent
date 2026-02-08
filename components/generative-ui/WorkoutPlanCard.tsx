"use client";

import { useState, useEffect } from "react";
import { useSharedState } from "@/lib/state/shared-state";

type Exercise = {
  name: string;
  target_sets: number;
  notes?: string;
};

type WorkoutPlanData = {
  focus: string;
  exercises: Exercise[];
  rationale: string;
};

type Props = {
  data: WorkoutPlanData;
  isLoading: boolean;
};

export function WorkoutPlanCard({ data, isLoading }: Props) {
  const { state, persistPlan } = useSharedState();
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // Hydrate: if planned exercises already exist in the session, mark as started
  useEffect(() => {
    if (state.currentSession.plannedExercises.length > 0) {
      setStarted(true);
    }
  }, [state.currentSession.plannedExercises]);

  async function handleStart() {
    setStarting(true);
    try {
      await persistPlan(
        data.exercises.map((e) => ({
          name: e.name,
          target_sets: e.target_sets,
          notes: e.notes,
        }))
      );
      setStarted(true);
    } finally {
      setStarting(false);
    }
  }

  function toggleExercise(index: number) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-4 w-40 rounded bg-surface-elevated" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 w-full rounded bg-surface-elevated" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          workout plan
        </span>
        {started && (
          <span className="text-xs font-medium text-success">Active</span>
        )}
      </div>

      <h3 className="text-base font-semibold text-text-primary">{data.focus}</h3>
      <p className="mt-1 text-sm text-text-secondary">{data.rationale}</p>

      <div className="mt-3 space-y-1">
        {data.exercises.map((exercise, i) => (
          <button
            key={i}
            onClick={() => started && toggleExercise(i)}
            disabled={!started}
            className={`flex w-full items-center gap-3 rounded-[var(--radius-button)] px-3 py-3 text-left transition-colors ${
              started ? "active:bg-surface-elevated" : ""
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                completed.has(i)
                  ? "border-success bg-success text-background"
                  : "border-border"
              }`}
            >
              {completed.has(i) && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <div className="flex-1">
              <span
                className={`text-sm font-medium ${
                  completed.has(i) ? "text-text-secondary line-through" : "text-text-primary"
                }`}
              >
                {exercise.name}
              </span>
              <span className="ml-2 text-xs text-text-secondary">
                {exercise.target_sets} sets
              </span>
            </div>
          </button>
        ))}
      </div>

      {!started && (
        <button
          onClick={handleStart}
          disabled={starting}
          className="mt-3 min-h-[44px] w-full rounded-[var(--radius-button)] bg-primary px-4 py-3 text-sm font-medium text-white active:bg-primary-hover disabled:opacity-50"
        >
          {starting ? "Starting..." : "Start Session"}
        </button>
      )}
    </div>
  );
}

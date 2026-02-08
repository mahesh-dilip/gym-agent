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

  if (isLoading) {
    return (
      <div className="tech-card p-4 animate-pulse">
        <div className="h-4 w-32 bg-surface-elevated rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-full bg-surface-elevated rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tech-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-surface-elevated/50 px-4 py-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
            WORKOUT_PLAN
          </span>
          {started && (
            <span className="flex h-2 w-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
          )}
        </div>
        <h3 className="text-sm font-bold text-text-primary tracking-tight">{data.focus.toUpperCase()}</h3>
        <p className="mt-1 text-xs text-text-tertiary leading-relaxed line-clamp-2">
           // {data.rationale}
        </p>
      </div>

      {/* List */}
      <div className="divide-y divide-border-subtle bg-surface">
        {data.exercises.map((exercise, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 group hover:bg-surface-elevated/30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-text-tertiary w-4">
                {(i + 1).toString().padStart(2, '0')}
              </span>
              <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                {exercise.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-secondary bg-surface-elevated px-1.5 py-0.5 rounded border border-border-subtle">
                {exercise.target_sets} SETS
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Action */}
      {!started && (
        <div className="p-3 border-t border-border bg-surface-elevated/10">
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_var(--color-primary)]"
          >
            {starting ? (
              <>INITIATING...</>
            ) : (
              <>START SESSION</>
            )}
          </button>
        </div>
      )}

      {started && (
        <div className="px-4 py-2 border-t border-border bg-success-muted/20">
          <p className="text-[10px] font-mono text-success text-center tracking-widest uppercase">
            PLAN ACTIVE - LOG AS YOU GO
          </p>
        </div>
      )}
    </div>
  );
}

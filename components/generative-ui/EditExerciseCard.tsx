"use client";

import { useEffect, useRef } from "react";
import { useSharedState } from "@/lib/state/shared-state";
import type { ExerciseLog } from "@/lib/supabase/types";

type Props = {
  data: {
    status: string;
    exercise_name: string;
    exercise?: ExerciseLog;
    message?: string;
  };
  isLoading: boolean;
};

export function EditExerciseCard({ data, isLoading }: Props) {
  const { dispatch } = useSharedState();
  const syncedRef = useRef(false);

  // Sync local state once when card mounts with updated exercise
  useEffect(() => {
    if (
      !syncedRef.current &&
      data?.status === "updated" &&
      data.exercise
    ) {
      syncedRef.current = true;
      dispatch({ type: "UPDATE_EXERCISE", payload: data.exercise });
    }
  }, [data?.status, data?.exercise, dispatch]);

  if (isLoading || !data) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-4 w-32 rounded bg-surface-elevated" />
        <div className="mt-2 h-3 w-48 rounded bg-surface-elevated" />
      </div>
    );
  }

  if (data.status === "not_found") {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-warning"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-[13px] text-text-secondary">
            No exercise matching &quot;{data.exercise_name}&quot; found in
            today&apos;s session
          </span>
        </div>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-muted p-4">
        <p className="text-[13px] text-danger">
          {data.message || "Failed to update exercise"}
        </p>
      </div>
    );
  }

  const ex = data.exercise;
  if (!ex) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          Updated
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h3 className="text-[15px] font-semibold text-text-primary">
        {ex.exercise_name}
      </h3>

      <div className="mt-1 flex flex-wrap gap-2 text-[13px] text-text-secondary">
        {ex.sets && <span>{ex.sets} sets</span>}
        {ex.sets && (ex.reps || ex.weight) && <span>·</span>}
        {ex.reps && <span>{ex.reps} reps</span>}
        {ex.reps && ex.weight && <span>·</span>}
        {ex.weight && (
          <span>
            {ex.weight} {ex.weight_unit || "kg"}
          </span>
        )}
        {ex.duration_minutes && <span>{ex.duration_minutes} min</span>}
        {ex.duration_minutes && ex.distance_km && <span>·</span>}
        {ex.distance_km && <span>{ex.distance_km} km</span>}
      </div>

      {ex.notes && (
        <p className="mt-1 text-[12px] text-text-tertiary">{ex.notes}</p>
      )}
    </div>
  );
}

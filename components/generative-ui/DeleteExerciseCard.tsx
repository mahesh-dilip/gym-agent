"use client";

import { useEffect, useRef } from "react";
import { useSharedState } from "@/lib/state/shared-state";

type DeletedExercise = {
  id: string;
  exercise_name: string;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  weight_unit?: string;
  duration_minutes?: number | null;
};

type Props = {
  data: {
    status: string;
    exercise_name: string;
    deleted_count?: number;
    deleted_exercises?: DeletedExercise[];
    deleted_ids?: string[];
    message?: string;
  };
  isLoading: boolean;
};

export function DeleteExerciseCard({ data, isLoading }: Props) {
  const { dispatch } = useSharedState();
  const syncedRef = useRef(false);

  // Sync local state once when card mounts with deleted IDs
  useEffect(() => {
    if (
      !syncedRef.current &&
      data?.status === "deleted" &&
      data.deleted_ids &&
      data.deleted_ids.length > 0
    ) {
      syncedRef.current = true;
      dispatch({ type: "REMOVE_EXERCISES", payload: data.deleted_ids });
    }
  }, [data?.status, data?.deleted_ids, dispatch]);

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
          {data.message || "Failed to delete exercise"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-danger">
          Deleted
        </span>
        <span className="text-[11px] text-text-tertiary">
          {data.deleted_count} removed
        </span>
      </div>

      {data.deleted_exercises?.map((ex) => (
        <div key={ex.id} className="flex items-center gap-2 py-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="shrink-0 text-danger"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="text-[13px] text-text-secondary line-through">
            {ex.exercise_name}
          </span>
          <span className="ml-auto text-[11px] text-text-tertiary">
            {[
              ex.sets && `${ex.sets}s`,
              ex.reps && `${ex.reps}r`,
              ex.weight && `${ex.weight}${ex.weight_unit || "kg"}`,
              ex.duration_minutes && `${ex.duration_minutes}m`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      ))}
    </div>
  );
}

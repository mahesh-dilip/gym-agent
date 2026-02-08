"use client";

import { format, parseISO } from "date-fns";

type Exercise = {
  exercise_name: string;
  category: string;
  sets?: number;
  reps?: number;
  weight?: number;
  weight_unit?: string;
  duration_minutes?: number;
  distance_km?: number;
  notes?: string;
};

type BackfillData = {
  status: string;
  message?: string;
  date: string;
  exercise_count?: number;
  exercises: Exercise[];
  notes?: string;
};

type Props = {
  data: BackfillData;
  isLoading: boolean;
};

function formatExerciseDetail(e: Exercise): string {
  const parts: string[] = [];
  if (e.sets) parts.push(`${e.sets}s`);
  if (e.reps) parts.push(`${e.reps}r`);
  if (e.weight) parts.push(`${e.weight}${e.weight_unit || "kg"}`);
  if (e.duration_minutes) parts.push(`${e.duration_minutes}min`);
  if (e.distance_km) parts.push(`${e.distance_km}km`);
  return parts.join(" · ");
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEE, MMM d");
  } catch {
    return dateStr;
  }
}

export function BackfillCard({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <div className="h-4 w-32 rounded bg-surface-elevated" />
        <div className="mt-2 h-3 w-48 rounded bg-surface-elevated" />
      </div>
    );
  }

  const isError = data.status === "error";
  const isSaved = data.status === "saved";

  if (isError) {
    return (
      <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/10 p-4">
        <p className="text-sm font-medium text-danger">
          Failed to save workout
        </p>
        <p className="mt-1 text-xs text-danger/70">
          {data.message || "Something went wrong. Try again."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-sm font-medium text-text-primary">
            {formatDate(data.date)}
          </span>
        </div>
        {isSaved && (
          <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
            Saved
          </span>
        )}
      </div>

      {/* Exercise list */}
      <div className="mt-3 space-y-1.5">
        {data.exercises.map((e, i) => {
          const detail = formatExerciseDetail(e);
          return (
            <div
              key={i}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-text-primary">
                {e.exercise_name}
              </span>
              {detail && (
                <span className="text-xs text-text-secondary">
                  {detail}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {data.notes && (
        <p className="mt-2 text-xs italic text-text-secondary">
          {data.notes}
        </p>
      )}
    </div>
  );
}

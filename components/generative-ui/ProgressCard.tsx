"use client";

import { format, parseISO } from "date-fns";

type HistoryEntry = {
  date: string;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
  duration_minutes?: number | null;
  distance_km?: number | null;
};

type PersonalBest = {
  weight: number;
  weight_unit: string;
  reps?: number | null;
  date: string;
};

type ProgressData = {
  status: string;
  exercise_name: string;
  message?: string;
  total_sessions?: number;
  history?: HistoryEntry[];
  personal_best?: PersonalBest | null;
};

type Props = {
  data: ProgressData;
  isLoading: boolean;
};

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

function formatEntry(e: HistoryEntry): string {
  const parts: string[] = [];
  if (e.sets) parts.push(`${e.sets}s`);
  if (e.reps) parts.push(`${e.reps}r`);
  if (e.weight) parts.push(`${e.weight}${e.weight_unit || "kg"}`);
  if (e.duration_minutes) parts.push(`${e.duration_minutes}min`);
  if (e.distance_km) parts.push(`${e.distance_km}km`);
  return parts.join(" · ");
}

export function ProgressCard({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-4 w-32 rounded bg-surface-elevated" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-surface-elevated" />
          <div className="h-3 w-3/4 rounded bg-surface-elevated" />
        </div>
      </div>
    );
  }

  if (data.status === "no_data") {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h3 className="text-base font-semibold text-text-primary">
          {data.exercise_name}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          No history found yet. Start logging to track your progress.
        </p>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/10 p-4">
        <p className="text-sm font-medium text-danger">
          {data.message || "Failed to load progress"}
        </p>
      </div>
    );
  }

  const history = data.history || [];
  const pb = data.personal_best;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">
          {data.exercise_name}
        </h3>
        <span className="text-xs text-text-secondary">
          {data.total_sessions} session{data.total_sessions !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Personal best */}
      {pb && (
        <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-button)] bg-warning/10 px-3 py-2">
          <span className="text-sm font-bold text-warning">PR</span>
          <span className="text-sm text-text-primary">
            {pb.weight} {pb.weight_unit}
            {pb.reps ? ` x ${pb.reps}` : ""}
          </span>
          <span className="ml-auto text-xs text-text-secondary">
            {formatDate(pb.date)}
          </span>
        </div>
      )}

      {/* History list */}
      <div className="mt-3 space-y-1.5">
        {history.map((entry, i) => {
          const detail = formatEntry(entry);
          const isPB =
            pb &&
            entry.weight === pb.weight &&
            entry.date === pb.date;
          return (
            <div
              key={i}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-text-secondary">
                {formatDate(entry.date)}
              </span>
              <span
                className={`text-sm ${
                  isPB ? "font-medium text-warning" : "text-text-primary"
                }`}
              >
                {detail || "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

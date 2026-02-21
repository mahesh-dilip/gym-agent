"use client";

import { format, parseISO } from "date-fns";
import { formatSetDetails } from "@/lib/format-sets";
import type { SetDetail } from "@/lib/supabase/types";

type HistoryEntry = {
  date: string;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
  duration_minutes?: number | null;
  distance_km?: number | null;
  set_details?: SetDetail[] | null;
  rpe?: number | null;
  volume?: number | null;
  estimated_1rm?: number | null;
};

type PersonalBest = {
  weight: number;
  weight_unit: string;
  reps?: number | null;
  date: string;
};

type ProgressStats = {
  trend?: "up" | "down" | "flat" | null;
  avg_frequency_days?: number | null;
  best_estimated_1rm?: number | null;
  best_estimated_1rm_unit?: string | null;
};

type ProgressData = {
  status: string;
  exercise_name: string;
  message?: string;
  total_sessions?: number;
  history?: HistoryEntry[];
  personal_best?: PersonalBest | null;
  stats?: ProgressStats | null;
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
  if (e.set_details && e.set_details.length > 0) {
    return formatSetDetails(e.set_details, e.weight_unit || "kg");
  }
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
  const stats = data.stats;

  const trendLabel = stats?.trend === "up" ? "Trending Up" : stats?.trend === "down" ? "Trending Down" : stats?.trend === "flat" ? "Holding Steady" : null;
  const trendColor = stats?.trend === "up" ? "text-success" : stats?.trend === "down" ? "text-danger" : "text-text-secondary";

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

      {/* Stats summary row */}
      {stats && (
        <div className="mt-2 flex items-center gap-4 py-2 border-b border-border/50">
          {stats.best_estimated_1rm && (
            <div className="flex flex-col">
              <span className="text-lg font-mono font-bold text-text-primary leading-none">
                {stats.best_estimated_1rm}
              </span>
              <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-0.5">
                EST 1RM ({stats.best_estimated_1rm_unit})
              </span>
            </div>
          )}
          {stats.avg_frequency_days !== null && stats.avg_frequency_days !== undefined && (
            <div className="flex flex-col">
              <span className="text-lg font-mono font-bold text-text-primary leading-none">
                {stats.avg_frequency_days}d
              </span>
              <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-0.5">
                FREQUENCY
              </span>
            </div>
          )}
          {trendLabel && (
            <div className="flex flex-col ml-auto items-end">
              <span className={`text-xs font-bold ${trendColor}`}>
                {stats.trend === "up" && "\u2191 "}{stats.trend === "down" && "\u2193 "}{stats.trend === "flat" && "\u2192 "}
                {trendLabel}
              </span>
            </div>
          )}
        </div>
      )}

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
              className="flex items-center justify-between gap-2"
            >
              <span className="text-sm text-text-secondary shrink-0">
                {formatDate(entry.date)}
              </span>
              <div className="flex items-center gap-2">
                {entry.rpe && (
                  <span className="text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded shrink-0">
                    RPE {entry.rpe}
                  </span>
                )}
                <span
                  className={`text-sm ${
                    isPB ? "font-medium text-warning" : "text-text-primary"
                  }`}
                >
                  {detail || "\u2014"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

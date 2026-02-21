"use client";

import { format, parseISO } from "date-fns";

type PREntry = {
  exercise_name: string;
  pr_weight: number;
  pr_weight_unit: string;
  pr_reps: number | null;
  pr_date: string;
  total_sessions: number;
  estimated_1rm: number | null;
  improvement_pct: number | null;
};

type PRData = {
  status: string;
  message?: string;
  total_exercises?: number;
  prs?: PREntry[];
};

type Props = {
  data: PRData;
  isLoading: boolean;
};

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

export function PRDashboardCard({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-4 w-36 rounded bg-surface-elevated" />
        <div className="mt-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-surface-elevated" />
          ))}
        </div>
      </div>
    );
  }

  if (data.status === "no_data") {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h3 className="text-base font-semibold text-text-primary">Personal Records</h3>
        <p className="mt-1 text-sm text-text-secondary">No data yet. Start logging to track PRs.</p>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/10 p-4">
        <p className="text-sm font-medium text-danger">{data.message || "Failed to load PRs"}</p>
      </div>
    );
  }

  const prs = data.prs || [];

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-primary">Personal Records</h3>
        <span className="text-xs text-text-secondary">
          {data.total_exercises} exercise{data.total_exercises !== 1 ? "s" : ""}
        </span>
      </div>

      {/* PR list */}
      <div className="space-y-0">
        {prs.map((pr, i) => (
          <div
            key={pr.exercise_name}
            className={`flex items-center gap-3 py-2.5 ${
              i < prs.length - 1 ? "border-b border-border/50" : ""
            }`}
          >
            {/* Exercise name + date */}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary truncate">
                {pr.exercise_name}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-text-tertiary">
                  {formatDate(pr.pr_date)}
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {pr.total_sessions}x
                </span>
              </div>
            </div>

            {/* PR weight */}
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-mono font-bold text-warning leading-none stat-value">
                  {pr.pr_weight}
                </span>
                <span className="text-[10px] text-text-tertiary">{pr.pr_weight_unit}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {pr.pr_reps && (
                  <span className="text-[10px] text-text-tertiary">
                    x{pr.pr_reps}
                  </span>
                )}
                {pr.estimated_1rm && (
                  <span className="text-[10px] font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">
                    1RM {pr.estimated_1rm}
                  </span>
                )}
                {pr.improvement_pct !== null && pr.improvement_pct > 0 && (
                  <span className="text-[10px] font-bold text-success">
                    +{pr.improvement_pct}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

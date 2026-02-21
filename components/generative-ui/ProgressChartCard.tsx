"use client";

import { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { format, parseISO, subWeeks, subMonths } from "date-fns";
import { CHART_COLORS, darkScaleOptions, darkTooltipOptions } from "@/lib/charts/chart-config";
import type { SetDetail } from "@/lib/supabase/types";

type TimeRange = "4w" | "3m" | "6m" | "all";
type Metric = "weight" | "volume";

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
  view?: string;
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

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "4w", label: "4W" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "all", label: "ALL" },
];

function getDateCutoff(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case "4w": return subWeeks(now, 4);
    case "3m": return subMonths(now, 3);
    case "6m": return subMonths(now, 6);
    case "all": return null;
  }
}

export function ProgressChartCard({ data, isLoading }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("3m");
  const [metric, setMetric] = useState<Metric>("weight");

  const filteredHistory = useMemo(() => {
    if (!data.history) return [];
    const cutoff = getDateCutoff(timeRange);
    const sorted = [...data.history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (!cutoff) return sorted;
    return sorted.filter((e) => new Date(e.date) >= cutoff);
  }, [data.history, timeRange]);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-4 w-32 rounded bg-surface-elevated" />
        <div className="mt-3 h-[160px] rounded bg-surface-elevated" />
      </div>
    );
  }

  if (data.status === "no_data") {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h3 className="text-base font-semibold text-text-primary">{data.exercise_name}</h3>
        <p className="mt-1 text-sm text-text-secondary">No history found yet.</p>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/10 p-4">
        <p className="text-sm font-medium text-danger">{data.message || "Failed to load progress"}</p>
      </div>
    );
  }

  const pb = data.personal_best;
  const stats = data.stats;
  const unit = pb?.weight_unit || "kg";

  const labels = filteredHistory.map((e) => {
    try { return format(parseISO(e.date), "MMM d"); }
    catch { return e.date; }
  });

  const values = filteredHistory.map((e) =>
    metric === "weight" ? (e.weight ?? null) : (e.volume ?? null)
  );

  // Highlight PR point
  const prIndex = pb
    ? filteredHistory.findIndex((e) => e.date === pb.date && e.weight === pb.weight)
    : -1;

  const pointColors = values.map((_, i) =>
    i === prIndex ? CHART_COLORS.warning : CHART_COLORS.primary
  );
  const pointRadii = values.map((_, i) =>
    i === prIndex ? 5 : 2
  );

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: CHART_COLORS.primary,
        backgroundColor: `${CHART_COLORS.primary}15`,
        pointBackgroundColor: pointColors,
        pointRadius: pointRadii,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...darkTooltipOptions,
        callbacks: {
          title: (ctx) => ctx[0]?.label || "",
          label: (ctx) => {
            const entry = filteredHistory[ctx.dataIndex];
            const lines: string[] = [];
            if (metric === "weight") {
              lines.push(`${ctx.parsed.y ?? 0} ${unit}`);
              if (entry?.volume) lines.push(`Vol: ${entry.volume} ${unit}`);
            } else {
              lines.push(`Vol: ${ctx.parsed.y ?? 0} ${unit}`);
              if (entry?.weight) lines.push(`Weight: ${entry.weight} ${unit}`);
            }
            if (entry?.estimated_1rm) lines.push(`Est 1RM: ${entry.estimated_1rm} ${unit}`);
            if (entry?.rpe) lines.push(`RPE ${entry.rpe}`);
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        ...darkScaleOptions,
        ticks: {
          ...darkScaleOptions.ticks,
          maxTicksLimit: 6,
          maxRotation: 0,
        },
      },
      y: {
        ...darkScaleOptions,
        ticks: {
          ...darkScaleOptions.ticks,
          maxTicksLimit: 5,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "nearest" as const,
    },
  };

  const trendArrow = stats?.trend === "up" ? "\u2191" : stats?.trend === "down" ? "\u2193" : stats?.trend === "flat" ? "\u2192" : null;
  const trendColor = stats?.trend === "up" ? "text-success" : stats?.trend === "down" ? "text-danger" : "text-text-secondary";

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-primary">{data.exercise_name}</h3>
        <span className="text-xs text-text-secondary">
          {data.total_sessions} session{data.total_sessions !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="flex items-center gap-4 mb-3 pb-3 border-b border-border/50">
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
          {pb && (
            <div className="flex flex-col">
              <span className="text-lg font-mono font-bold text-warning leading-none">
                {pb.weight}
              </span>
              <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-0.5">
                PR ({unit})
              </span>
            </div>
          )}
          {trendArrow && (
            <div className={`flex flex-col ml-auto items-end`}>
              <span className={`text-sm font-bold ${trendColor}`}>
                {trendArrow} {stats.trend === "up" ? "Up" : stats.trend === "down" ? "Down" : "Steady"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Controls: metric toggle + time range */}
      <div className="flex items-center justify-between mb-3">
        {/* Metric toggle */}
        <div className="flex gap-1 bg-surface-elevated rounded-[var(--radius-button)] p-0.5">
          {(["weight", "volume"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-[4px] transition-colors ${
                metric === m
                  ? "bg-primary/20 text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {m === "weight" ? "Weight" : "Volume"}
            </button>
          ))}
        </div>

        {/* Time range */}
        <div className="flex gap-1 bg-surface-elevated rounded-[var(--radius-button)] p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setTimeRange(r.key)}
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-[4px] transition-colors ${
                timeRange === r.key
                  ? "bg-primary/20 text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {filteredHistory.length < 2 ? (
        <div className="h-[160px] flex items-center justify-center text-xs text-text-tertiary">
          Not enough data for this range
        </div>
      ) : (
        <div className="h-[160px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}

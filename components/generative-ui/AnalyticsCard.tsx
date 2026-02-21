"use client";

import { Doughnut, Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { format, parseISO } from "date-fns";
import { CHART_COLORS, MUSCLE_COLORS, darkScaleOptions, darkTooltipOptions } from "@/lib/charts/chart-config";

type MuscleDistribution = {
  muscle: string;
  volume: number;
  percentage: number;
};

type WeeklyVolume = {
  week: string;
  muscles: Record<string, number>;
};

type AnalyticsData = {
  status: string;
  message?: string;
  period_weeks?: number;
  total_sessions?: number;
  total_volume?: number;
  weekly_volume?: WeeklyVolume[];
  muscle_distribution?: MuscleDistribution[];
};

type Props = {
  data: AnalyticsData;
  isLoading: boolean;
};

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function formatWeekLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] || CHART_COLORS.textTertiary;
}

export function AnalyticsCard({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-4 w-40 rounded bg-surface-elevated" />
        <div className="mt-3 h-[140px] rounded bg-surface-elevated" />
      </div>
    );
  }

  if (data.status === "no_data") {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h3 className="text-base font-semibold text-text-primary">Training Analytics</h3>
        <p className="mt-1 text-sm text-text-secondary">{data.message || "No data yet."}</p>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/10 p-4">
        <p className="text-sm font-medium text-danger">{data.message || "Failed to load analytics"}</p>
      </div>
    );
  }

  const distribution = data.muscle_distribution || [];
  const weekly = data.weekly_volume || [];
  const allMuscles = Array.from(new Set(distribution.map((d) => d.muscle)));

  // Doughnut data
  const doughnutData = {
    labels: distribution.map((d) => d.muscle),
    datasets: [
      {
        data: distribution.map((d) => d.volume),
        backgroundColor: distribution.map((d) => getMuscleColor(d.muscle)),
        borderColor: CHART_COLORS.surface,
        borderWidth: 2,
        hoverBorderColor: CHART_COLORS.border,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: { display: false },
      tooltip: {
        ...darkTooltipOptions,
        callbacks: {
          label: (ctx: { label: string; parsed: number }) => {
            const pct = distribution.find((d) => d.muscle === ctx.label)?.percentage || 0;
            return `${ctx.label}: ${formatVolume(ctx.parsed)} kg (${pct}%)`;
          },
        },
      },
    },
  };

  // Stacked bar data
  const barData = {
    labels: weekly.map((w) => formatWeekLabel(w.week)),
    datasets: allMuscles.map((muscle) => ({
      label: muscle,
      data: weekly.map((w) => w.muscles[muscle] || 0),
      backgroundColor: getMuscleColor(muscle),
      borderRadius: 2,
    })),
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...darkTooltipOptions,
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label || ""}: ${formatVolume(ctx.parsed.y ?? 0)} kg`,
        },
      },
    },
    scales: {
      x: {
        ...darkScaleOptions,
        stacked: true,
        ticks: { ...darkScaleOptions.ticks, maxRotation: 0 },
      },
      y: {
        ...darkScaleOptions,
        stacked: true,
        ticks: {
          ...darkScaleOptions.ticks,
          maxTicksLimit: 4,
          callback: (v) => formatVolume(Number(v)),
        },
      },
    },
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-primary">Training Analytics</h3>
        <span className="text-xs text-text-secondary">{data.period_weeks}w</span>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-4 mb-3 pb-3 border-b border-border/50">
        <div className="flex flex-col">
          <span className="text-lg font-mono font-bold text-text-primary leading-none">
            {data.total_sessions}
          </span>
          <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-0.5">
            SESSIONS
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-mono font-bold text-text-primary leading-none">
            {formatVolume(data.total_volume || 0)}
          </span>
          <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-0.5">
            TOTAL VOL (KG)
          </span>
        </div>
        {data.total_sessions && data.total_volume ? (
          <div className="flex flex-col ml-auto items-end">
            <span className="text-lg font-mono font-bold text-text-primary leading-none">
              {formatVolume(Math.round(data.total_volume / data.total_sessions))}
            </span>
            <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-0.5">
              AVG / SESSION
            </span>
          </div>
        ) : null}
      </div>

      {/* Muscle distribution: doughnut + legend side by side */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-[100px] h-[100px] shrink-0">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {distribution.slice(0, 6).map((d) => (
            <div key={d.muscle} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getMuscleColor(d.muscle) }}
              />
              <span className="text-xs text-text-secondary truncate flex-1">{d.muscle}</span>
              <span className="text-xs font-mono text-text-primary shrink-0">{d.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly volume bar chart */}
      {weekly.length > 1 && (
        <>
          <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-2">
            Weekly Volume
          </p>
          <div className="h-[120px]">
            <Bar data={barData} options={barOptions} />
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format, parseISO, subWeeks, startOfWeek } from "date-fns";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import {
  CHART_COLORS,
  MUSCLE_COLORS,
  darkScaleOptions,
  darkTooltipOptions,
} from "@/lib/charts/chart-config";
import { inferMuscleGroup } from "@/lib/muscle-groups";
import type { ExerciseLog, SetDetail } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type TimeRange = "4w" | "3m" | "6m" | "all";

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

type MuscleDistribution = {
  muscle: string;
  volume: number;
  percentage: number;
};

type WeeklyVolume = {
  week: string;
  muscles: Record<string, number>;
};

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

function formatWeekLabel(dateStr: string): string {
  try { return format(parseISO(dateStr), "MMM d"); }
  catch { return dateStr; }
}

function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] || CHART_COLORS.textTertiary;
}

function getVolume(log: ExerciseLog): number {
  const sd = log.set_details as SetDetail[] | null;
  if (sd && sd.length > 0) {
    return sd.reduce((sum, s) => {
      if (s.weight && s.reps) return sum + s.weight * s.reps;
      return sum;
    }, 0);
  }
  if (log.sets && log.reps && log.weight) return log.sets * log.reps * log.weight;
  return 0;
}

export default function StatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<(ExerciseLog & { session_date: string })[]>([]);
  const [activeTab, setActiveTab] = useState<"prs" | "analytics">("prs");
  const [timeRange, setTimeRange] = useState<TimeRange>("3m");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("exercise_logs")
        .select("*, workout_sessions!inner(date)")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false });

      if (data) {
        setLogs(
          data.map((d) => ({
            ...d,
            session_date: (d.workout_sessions as unknown as { date: string }).date,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [router]);

  // --- PRs ---
  const prs = useMemo<PREntry[]>(() => {
    const map = new Map<string, {
      exercise_name: string;
      pr_weight: number;
      pr_weight_unit: string;
      pr_reps: number | null;
      pr_date: string;
      total_sessions: number;
      first_weight: number | null;
      estimated_1rm: number | null;
    }>();

    for (const log of logs) {
      if (!log.weight) continue;
      const name = log.exercise_name;
      const existing = map.get(name);
      if (!existing) {
        const est = log.reps && log.reps > 0 ? Math.round(log.weight * (1 + log.reps / 30)) : null;
        map.set(name, {
          exercise_name: name,
          pr_weight: log.weight,
          pr_weight_unit: log.weight_unit,
          pr_reps: log.reps,
          pr_date: log.session_date,
          total_sessions: 1,
          first_weight: log.weight,
          estimated_1rm: est,
        });
      } else {
        existing.total_sessions++;
        existing.first_weight = log.weight; // logs are desc, so last = oldest
        if (log.weight > existing.pr_weight) {
          existing.pr_weight = log.weight;
          existing.pr_weight_unit = log.weight_unit;
          existing.pr_reps = log.reps;
          existing.pr_date = log.session_date;
        }
        const est = log.weight && log.reps && log.reps > 0
          ? Math.round(log.weight * (1 + log.reps / 30)) : null;
        if (est && (!existing.estimated_1rm || est > existing.estimated_1rm)) {
          existing.estimated_1rm = est;
        }
      }
    }

    return Array.from(map.values())
      .map((pr) => ({
        ...pr,
        improvement_pct: pr.first_weight && pr.first_weight > 0
          ? Math.round(((pr.pr_weight - pr.first_weight) / pr.first_weight) * 100)
          : null,
      }))
      .sort((a, b) => b.pr_weight - a.pr_weight);
  }, [logs]);

  // --- Analytics ---
  const filteredLogs = useMemo(() => {
    if (timeRange === "all") return logs;
    const weeks = timeRange === "4w" ? 4 : timeRange === "3m" ? 13 : 26;
    const cutoff = subWeeks(new Date(), weeks);
    return logs.filter((l) => new Date(l.session_date) >= cutoff);
  }, [logs, timeRange]);

  const { muscleDistribution, weeklyVolume, totalVolume, totalSessions } = useMemo(() => {
    const weeklyMap = new Map<string, Map<string, number>>();
    const muscleVolumes = new Map<string, number>();
    const sessionDates = new Set<string>();

    for (const l of filteredLogs) {
      sessionDates.add(l.session_date);
      const weekStart = format(startOfWeek(new Date(l.session_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const muscle = inferMuscleGroup(l.exercise_name);
      const vol = getVolume(l);

      if (!weeklyMap.has(weekStart)) weeklyMap.set(weekStart, new Map());
      weeklyMap.get(weekStart)!.set(muscle, (weeklyMap.get(weekStart)!.get(muscle) || 0) + vol);
      muscleVolumes.set(muscle, (muscleVolumes.get(muscle) || 0) + vol);
    }

    const total = Array.from(muscleVolumes.values()).reduce((a, b) => a + b, 0);

    return {
      muscleDistribution: Array.from(muscleVolumes.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([muscle, volume]): MuscleDistribution => ({
          muscle,
          volume,
          percentage: total > 0 ? Math.round((volume / total) * 100) : 0,
        })),
      weeklyVolume: Array.from(weeklyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, muscles]): WeeklyVolume => ({
          week,
          muscles: Object.fromEntries(muscles),
        })),
      totalVolume: total,
      totalSessions: sessionDates.size,
    };
  }, [filteredLogs]);

  const allMuscles = muscleDistribution.map((d) => d.muscle);

  // --- Per-session volume (individual bars for each session date) ---
  const sessionVolumes = useMemo(() => {
    const dateMap = new Map<string, { volume: number; exercises: number }>();
    for (const l of filteredLogs) {
      const d = l.session_date;
      const existing = dateMap.get(d) || { volume: 0, exercises: 0 };
      existing.volume += getVolume(l);
      existing.exercises++;
      dateMap.set(d, existing);
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));
  }, [filteredLogs]);

  // --- Chart configs ---
  const doughnutData = {
    labels: muscleDistribution.map((d) => d.muscle),
    datasets: [{
      data: muscleDistribution.map((d) => d.volume),
      backgroundColor: muscleDistribution.map((d) => getMuscleColor(d.muscle)),
      borderColor: CHART_COLORS.surface,
      borderWidth: 2,
    }],
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: { display: false },
      tooltip: {
        ...darkTooltipOptions,
        callbacks: {
          label: (ctx) => {
            const pct = muscleDistribution.find((d) => d.muscle === ctx.label)?.percentage || 0;
            return `${ctx.label}: ${formatVolume(ctx.parsed)} kg (${pct}%)`;
          },
        },
      },
    },
  };

  // Per-session line chart
  const sessionLineData = {
    labels: sessionVolumes.map((s) => {
      try { return format(parseISO(s.date), "MMM d"); }
      catch { return s.date; }
    }),
    datasets: [{
      data: sessionVolumes.map((s) => s.volume),
      borderColor: CHART_COLORS.primary,
      backgroundColor: `${CHART_COLORS.primary}15`,
      pointBackgroundColor: CHART_COLORS.primary,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
      tension: 0.3,
      fill: true,
    }],
  };

  const sessionLineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...darkTooltipOptions,
        callbacks: {
          title: (ctx) => ctx[0]?.label || "",
          label: (ctx) => {
            const session = sessionVolumes[ctx.dataIndex];
            return [`Vol: ${formatVolume(ctx.parsed.y ?? 0)} kg`, `${session?.exercises || 0} exercises`];
          },
        },
      },
    },
    scales: {
      x: { ...darkScaleOptions, ticks: { ...darkScaleOptions.ticks, maxTicksLimit: 8, maxRotation: 0 } },
      y: { ...darkScaleOptions, ticks: { ...darkScaleOptions.ticks, maxTicksLimit: 4, callback: (v) => formatVolume(Number(v)) } },
    },
    interaction: { intersect: false, mode: "nearest" as const },
  };

  const barData = {
    labels: weeklyVolume.map((w) => {
      // Show "Week of MMM d" style with session count
      const label = formatWeekLabel(w.week);
      const sessionCount = sessionVolumes.filter((s) => {
        const ws = format(startOfWeek(new Date(s.date), { weekStartsOn: 1 }), "yyyy-MM-dd");
        return ws === w.week;
      }).length;
      return `${label} (${sessionCount})`;
    }),
    datasets: allMuscles.map((muscle) => ({
      label: muscle,
      data: weeklyVolume.map((w) => w.muscles[muscle] || 0),
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
          label: (ctx) => `${ctx.dataset.label || ""}: ${formatVolume(ctx.parsed.y ?? 0)} kg`,
        },
      },
    },
    scales: {
      x: { ...darkScaleOptions, stacked: true, ticks: { ...darkScaleOptions.ticks, maxRotation: 0 } },
      y: {
        ...darkScaleOptions,
        stacked: true,
        ticks: { ...darkScaleOptions.ticks, maxTicksLimit: 4, callback: (v) => formatVolume(Number(v)) },
      },
    },
  };

  const TIME_RANGES: { key: TimeRange; label: string }[] = [
    { key: "4w", label: "4W" },
    { key: "3m", label: "3M" },
    { key: "6m", label: "6M" },
    { key: "all", label: "ALL" },
  ];

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-xl safe-top">
        <button
          onClick={() => router.back()}
          className="p-1 text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-sm font-bold uppercase tracking-[0.15em] text-text-primary">Stats</h1>
        <div className="w-7" />
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-border bg-background">
        {(["prs", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition-colors relative ${
              activeTab === tab ? "text-text-primary" : "text-text-tertiary"
            }`}
          >
            {tab === "prs" ? "Personal Records" : "Analytics"}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar scroll-container px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
          </div>
        ) : activeTab === "prs" ? (
          /* === PRs Tab === */
          <div className="pt-4">
            <p className="text-xs text-text-tertiary mb-3">
              {prs.length} exercise{prs.length !== 1 ? "s" : ""} tracked
            </p>

            {prs.length === 0 ? (
              <p className="text-sm text-text-secondary mt-8 text-center">
                No exercises logged yet.
              </p>
            ) : (
              <div className="space-y-0">
                {prs.map((pr, i) => (
                  <div
                    key={pr.exercise_name}
                    className={`flex items-center gap-3 py-3 ${
                      i < prs.length - 1 ? "border-b border-border/50" : ""
                    }`}
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {pr.exercise_name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-text-tertiary">
                          {(() => { try { return format(parseISO(pr.pr_date), "MMM d"); } catch { return pr.pr_date; } })()}
                        </span>
                        <span className="text-[10px] text-text-tertiary">
                          {pr.total_sessions} session{pr.total_sessions !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-mono font-bold text-warning leading-none stat-value">
                          {pr.pr_weight}
                        </span>
                        <span className="text-[10px] text-text-tertiary">{pr.pr_weight_unit}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {pr.pr_reps && (
                          <span className="text-[10px] text-text-tertiary">x{pr.pr_reps}</span>
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
            )}
          </div>
        ) : (
          /* === Analytics Tab === */
          <div className="pt-4">
            {/* Time range selector */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-text-tertiary">
                {totalSessions} session{totalSessions !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-1 bg-surface-elevated rounded-[var(--radius-button)] p-0.5">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setTimeRange(r.key)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-[4px] transition-colors ${
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

            {filteredLogs.length === 0 ? (
              <p className="text-sm text-text-secondary mt-8 text-center">
                No data for this period.
              </p>
            ) : (
              <>
                {/* Summary stats */}
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
                  <div className="flex flex-col">
                    <span className="text-xl font-mono font-bold text-text-primary leading-none stat-value">
                      {formatVolume(totalVolume)}
                    </span>
                    <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-1">
                      TOTAL VOL (KG)
                    </span>
                  </div>
                  {totalSessions > 0 && (
                    <div className="flex flex-col ml-auto items-end">
                      <span className="text-xl font-mono font-bold text-text-primary leading-none stat-value">
                        {formatVolume(Math.round(totalVolume / totalSessions))}
                      </span>
                      <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-1">
                        AVG / SESSION
                      </span>
                    </div>
                  )}
                </div>

                {/* Muscle distribution */}
                <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-3">
                  Muscle Distribution
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-[110px] h-[110px] shrink-0">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {muscleDistribution.slice(0, 6).map((d) => (
                      <div key={d.muscle} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: getMuscleColor(d.muscle) }}
                        />
                        <span className="text-xs text-text-secondary truncate flex-1">{d.muscle}</span>
                        <span className="text-xs font-mono text-text-primary shrink-0">{d.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-session volume */}
                {sessionVolumes.length > 1 && (
                  <>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-3">
                      Volume Per Session
                    </p>
                    <div className="h-[160px] mb-6">
                      <Line data={sessionLineData} options={sessionLineOptions} />
                    </div>
                  </>
                )}

                {/* Weekly volume */}
                {weeklyVolume.length > 1 && (
                  <>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-3">
                      Weekly Volume
                      <span className="text-text-tertiary/60 ml-1">(sessions per week)</span>
                    </p>
                    <div className="h-[160px] mb-6">
                      <Bar data={barData} options={barOptions} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

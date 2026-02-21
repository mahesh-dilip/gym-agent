"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  format,
  differenceInMinutes,
  parseISO,
  isToday,
  isYesterday,
  startOfWeek,
  isSameWeek,
  set,
} from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import type {
  WorkoutSession,
  ExerciseLog,
  RecoveryLog,
  SetDetail,
} from "@/lib/supabase/types";
import { formatSetDetails, getSetDetailsVolume } from "@/lib/format-sets";
import { inferMuscleGroup } from "@/lib/muscle-groups";

export const dynamic = "force-dynamic";

const ACTIVITY_LABELS: Record<string, string> = {
  foam_rolling: "Foam Rolling",
  stretching: "Stretching",
  vyper: "Vyper Recovery",
  massage_gun: "Massage Gun",
  other: "Recovery",
};

function getMuscleGroups(exercises: ExerciseLog[]): string[] {
  const groups = new Set(exercises.map((e) => inferMuscleGroup(e.exercise_name)));
  groups.delete("Other");
  return Array.from(groups);
}

function formatDuration(session: WorkoutSession): number | null {
  if (!session.started_at) return null;
  const end = session.completed_at || new Date().toISOString();
  const mins = differenceInMinutes(parseISO(end), parseISO(session.started_at));
  return mins > 0 ? mins : null;
}

function formatDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "TODAY";
  if (isYesterday(date)) return "YESTERDAY";
  return format(date, "EEEE").toUpperCase();
}

function formatDateSub(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d").toUpperCase();
}

function groupByWeek(sessions: WorkoutSession[]): { label: string; sessions: WorkoutSession[] }[] {
  const weeks: Map<string, WorkoutSession[]> = new Map();
  const now = new Date();

  for (const s of sessions) {
    const date = parseISO(s.date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    let label: string;
    if (isSameWeek(date, now, { weekStartsOn: 1 })) {
      label = "THIS WEEK";
    } else {
      label = format(weekStart, "MMM d") + " – " + format(new Date(weekStart.getTime() + 6 * 86400000), "MMM d");
    }
    label = label.toUpperCase();
    if (!weeks.has(label)) weeks.set(label, []);
    weeks.get(label)!.push(s);
  }

  return Array.from(weeks.entries()).map(([label, sessions]) => ({ label, sessions }));
}

function getSessionVolume(exercises: ExerciseLog[]): number {
  return exercises.reduce((sum, e) => {
    if (e.set_details && (e.set_details as SetDetail[]).length > 0) {
      return sum + getSetDetailsVolume(e.set_details as SetDetail[]);
    }
    if (e.sets && e.reps && e.weight) return sum + e.sets * e.reps * e.weight;
    return sum;
  }, 0);
}

// ─── Streak calculation ─────────────────────────────────────────
function getStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const dates = sessions
    .filter((s) => s.status === "completed")
    .map((s) => s.date)
    .sort()
    .reverse();

  if (dates.length === 0) return 0;

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const curr = parseISO(dates[i]);
    const prev = parseISO(dates[i + 1]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff <= 2) streak++;
    else break;
  }
  return streak;
}

// ─── Week activity dots ─────────────────────────────────────────
function WeekDots({ sessions }: { sessions: WorkoutSession[] }) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const sessionDates = new Set(sessions.map((s) => s.date));

  return (
    <div className="flex items-center gap-1.5">
      {days.map((day, i) => {
        const date = new Date(weekStart.getTime() + i * 86400000);
        const dateStr = format(date, "yyyy-MM-dd");
        const isActive = sessionDates.has(dateStr);
        const isFuture = date > now;
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-mono text-text-tertiary">
              {day}
            </span>
            <div
              className={`h-1.5 w-1.5 transition-colors ${isActive
                  ? "bg-primary shadow-[0_0_5px_var(--color-primary)]"
                  : isFuture
                    ? "bg-border-subtle"
                    : "bg-surface-elevated border border-border-subtle"
                }`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Session card ───────────────────────────────────────────────
function SessionCard({
  session,
  index,
}: {
  session: WorkoutSession;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const exercises = (session.exercise_logs || []) as ExerciseLog[];
  const recovery = (session.recovery_logs || []) as RecoveryLog[];
  const planned = session.planned_exercises || [];
  const duration = formatDuration(session);
  const isComplete = session.status === "completed";
  const muscleGroups = getMuscleGroups(exercises);
  const volume = getSessionVolume(exercises);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="tech-card group relative w-full overflow-hidden p-0 text-left transition-all active:scale-[0.99] hover:border-text-tertiary/50"
      >
        {/* Top row: date + status */}
        <div className="flex items-stretch">
          {/* Status Stripe */}
          <div className={`w-1 ${isComplete ? "bg-primary" : "bg-warning"}`} />

          <div className="flex-1 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tracking-tight text-text-primary">
                  {formatDateLabel(session.date)}
                </span>
                <span className="text-[10px] bg-surface-elevated px-1.5 py-0.5 rounded border border-border-subtle font-mono text-text-secondary">
                  {formatDateSub(session.date)}
                </span>
              </div>
              {muscleGroups.length > 0 && (
                <div className="flex max-w-[120px] overflow-hidden justify-end gap-1 flex-wrap">
                  {muscleGroups.slice(0, 3).map((group) => (
                    <span
                      key={group}
                      className="text-[9px] font-mono text-text-tertiary uppercase"
                    >
                      {group}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6">
              {exercises.length > 0 && (
                <div className="flex flex-col">
                  <span className="stat-value text-lg font-mono leading-none text-text-secondary">
                    {exercises.length}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-text-tertiary">EXERCISES</span>
                </div>
              )}
              {duration && (
                <div className="flex flex-col">
                  <span className="stat-value text-lg font-mono leading-none text-text-secondary">
                    {duration}<span className="text-xs">m</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-text-tertiary">DURATION</span>
                </div>
              )}
              {volume > 0 && (
                <div className="flex flex-col">
                  <span className="stat-value text-lg font-mono leading-none text-text-secondary">
                    {volume >= 1000 ? (volume / 1000).toFixed(1) : volume}<span className="text-xs">{volume >= 1000 ? 'k' : ''}</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-text-tertiary">VOL (KG)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-surface-elevated/20 border-t border-border"
            >
              <div className="p-4 space-y-4">
                {/* Plan progress */}
                {planned.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                        Plan Completion
                      </span>
                      <span className="text-[10px] font-mono text-text-tertiary">
                        {exercises.filter((e) =>
                          planned.some((p) => p.name.toLowerCase() === e.exercise_name.toLowerCase())
                        ).length}
                        /{planned.length}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-0.5 overflow-hidden w-full bg-surface-elevated">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(exercises.filter((e) =>
                            planned.some(
                              (p) => p.name.toLowerCase() === e.exercise_name.toLowerCase()
                            )
                          ).length /
                              planned.length) *
                            100
                            }%`,
                        }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Logged exercises */}
                {exercises.length > 0 && (
                  <div>
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                      Log
                    </span>
                    <div className="space-y-1">
                      {exercises.map((e, i) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
                        >
                          <span className="text-xs font-medium text-text-primary">
                            {e.exercise_name}
                          </span>
                          <span className="text-[10px] font-mono text-text-tertiary">
                            {e.set_details && (e.set_details as SetDetail[]).length > 0
                              ? formatSetDetails(e.set_details as SetDetail[], e.weight_unit)
                              : [
                                  e.sets && `${e.sets}S`,
                                  e.reps && `${e.reps}R`,
                                  e.weight && `${e.weight}KG`,
                                  e.duration_minutes && `${e.duration_minutes}M`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {session.notes && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] font-mono text-text-tertiary uppercase mb-1">NOTES</p>
                    <p className="text-xs italic text-text-secondary">
                      "{session.notes}"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}

// ─── Main page ──────────────────────────────────────────────────
export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("workout_sessions")
        .select("*, exercise_logs(*), recovery_logs(*)")
        .order("date", { ascending: false })
        .limit(50);

      setSessions((data as WorkoutSession[]) || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const weeks = useMemo(() => groupByWeek(sessions), [sessions]);
  const streak = useMemo(() => getStreak(sessions), [sessions]);
  const totalSessions = sessions.filter((s) => s.status === "completed").length;
  const totalExercises = sessions.reduce(
    (sum, s) => sum + ((s.exercise_logs as ExerciseLog[]) || []).length,
    0
  );

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <div className="relative border-b border-border bg-surface/80 backdrop-blur-md z-10">
        <div className="flex items-center justify-between px-4 pb-3 pt-safe-top mt-3">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded transition-colors text-text-secondary hover:bg-surface-elevated"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xs font-bold tracking-[0.2em] font-mono text-text-primary uppercase">
            SESSION_HISTORY
          </h1>
          <a
            href="/api/export"
            download
            className="flex h-8 w-8 items-center justify-center rounded transition-colors text-text-secondary hover:bg-surface-elevated"
            aria-label="Export data"
            title="Export CSV"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </a>
        </div>

        {/* Stats bar */}
        {!loading && sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center justify-between border-t border-border px-4 py-4"
          >
            <div className="flex items-center gap-8">
              <div>
                <p className="stat-value text-2xl font-bold tracking-tighter text-text-primary leading-none">
                  {streak}
                </p>
                <p className="text-[9px] font-mono uppercase tracking-widest text-text-tertiary mt-1">
                  STREAK
                </p>
              </div>
              <div className="h-8 w-px bg-border-subtle" />
              <div>
                <p className="stat-value text-2xl font-bold tracking-tighter text-text-primary leading-none">
                  {totalSessions}
                </p>
                <p className="text-[9px] font-mono uppercase tracking-widest text-text-tertiary mt-1">
                  TOTAL
                </p>
              </div>
            </div>
            <WeekDots sessions={sessions} />
          </motion.div>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto hide-scrollbar bg-background">
        {loading && (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded border border-border bg-surface p-4"
              >
                <div className="h-4 w-24 rounded bg-surface-elevated mb-2" />
                <div className="h-8 w-full rounded bg-surface-elevated" />
              </div>
            ))}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-text-tertiary">
                <div className="h-1 w-1 bg-text-tertiary rounded-full" />
              </div>
              <p className="text-xs font-mono uppercase tracking-widest text-text-tertiary">
                NO_DATA_FOUND
              </p>
            </motion.div>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="pb-8 pt-2">
            {weeks.map((week) => (
              <div key={week.label} className="mb-6">
                <div className="sticky top-0 z-0 px-4 py-2">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-text-tertiary/50">
                    {week.label}
                  </span>
                </div>
                <div className="space-y-3 px-4">
                  {week.sessions.map((session, i) => (
                    <SessionCard key={session.id} session={session} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

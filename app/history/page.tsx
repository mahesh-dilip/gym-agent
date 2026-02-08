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
} from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import type {
  WorkoutSession,
  ExerciseLog,
  RecoveryLog,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ACTIVITY_LABELS: Record<string, string> = {
  foam_rolling: "Foam Rolling",
  stretching: "Stretching",
  vyper: "Vyper Recovery",
  massage_gun: "Massage Gun",
  other: "Recovery",
};

const MUSCLE_GROUPS: Record<string, string> = {
  bench: "Chest",
  "chest press": "Chest",
  "incline": "Chest",
  fly: "Chest",
  squat: "Legs",
  "leg press": "Legs",
  "leg curl": "Legs",
  "leg extension": "Legs",
  lunge: "Legs",
  "calf": "Legs",
  deadlift: "Back",
  row: "Back",
  "lat pull": "Back",
  "pull up": "Back",
  "pull-up": "Back",
  "pulldown": "Back",
  curl: "Arms",
  "bicep": "Arms",
  "tricep": "Arms",
  "hammer": "Arms",
  "shoulder": "Shoulders",
  "overhead press": "Shoulders",
  "lateral raise": "Shoulders",
  "military press": "Shoulders",
  plank: "Core",
  crunch: "Core",
  "ab ": "Core",
};

function inferMuscleGroup(exerciseName: string): string {
  const lower = exerciseName.toLowerCase();
  for (const [key, group] of Object.entries(MUSCLE_GROUPS)) {
    if (lower.includes(key)) return group;
  }
  return "Other";
}

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
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE");
}

function formatDateSub(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d");
}

function groupByWeek(sessions: WorkoutSession[]): { label: string; sessions: WorkoutSession[] }[] {
  const weeks: Map<string, WorkoutSession[]> = new Map();
  const now = new Date();

  for (const s of sessions) {
    const date = parseISO(s.date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    let label: string;
    if (isSameWeek(date, now, { weekStartsOn: 1 })) {
      label = "This Week";
    } else {
      label = format(weekStart, "MMM d") + " – " + format(new Date(weekStart.getTime() + 6 * 86400000), "MMM d");
    }
    if (!weeks.has(label)) weeks.set(label, []);
    weeks.get(label)!.push(s);
  }

  return Array.from(weeks.entries()).map(([label, sessions]) => ({ label, sessions }));
}

function getSessionVolume(exercises: ExerciseLog[]): number {
  return exercises.reduce((sum, e) => {
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
            <span className="text-[10px] font-medium text-text-tertiary">
              {day}
            </span>
            <div
              className={`h-2 w-2 rounded-full transition-colors ${
                isActive
                  ? "bg-primary"
                  : isFuture
                    ? "bg-border-subtle"
                    : "bg-surface-elevated"
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
        className="group relative w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left transition-all active:scale-[0.98]"
      >
        {/* Top row: date + status */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-text-primary">
                {formatDateLabel(session.date)}
              </span>
              <span className="text-xs text-text-tertiary">
                {formatDateSub(session.date)}
              </span>
            </div>
            {/* Muscle group pills */}
            {muscleGroups.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {muscleGroups.map((group) => (
                  <span
                    key={group}
                    className="rounded-[var(--radius-pill)] bg-primary-muted px-2 py-0.5 text-[11px] font-medium text-primary-hover"
                  >
                    {group}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {isComplete ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success-muted">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-success"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <div className="h-2 w-2 animate-pulse rounded-full bg-warning" />
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-4">
          {exercises.length > 0 && (
            <div className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-text-tertiary">
                <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M4.5 6.5v11M19.5 6.5v11" />
              </svg>
              <span className="stat-value text-xs font-medium text-text-secondary">
                {exercises.length}
              </span>
            </div>
          )}
          {duration && (
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-text-tertiary">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="stat-value text-xs font-medium text-text-secondary">
                {duration}m
              </span>
            </div>
          )}
          {volume > 0 && (
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-text-tertiary">
                <path d="M2 20h20M5 20V10M9 20V4M13 20V14M17 20V8M21 20V2" />
              </svg>
              <span className="stat-value text-xs font-medium text-text-secondary">
                {volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : volume} kg
              </span>
            </div>
          )}
          {recovery.length > 0 && (
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-text-tertiary">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="stat-value text-xs font-medium text-text-secondary">
                {recovery.length}
              </span>
            </div>
          )}
        </div>

        {/* Exercise summary line */}
        {exercises.length > 0 && !expanded && (
          <p className="mt-2 truncate text-[13px] text-text-tertiary">
            {exercises.map((e) => e.exercise_name).join(" · ")}
          </p>
        )}

        {/* Expand chevron */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-text-tertiary"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="mx-px rounded-b-[var(--radius-card)] border border-t-0 border-border bg-surface px-4 pb-4 pt-1">
              {/* Plan progress */}
              {planned.length > 0 && (
                <div className="mb-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                      Plan
                    </span>
                    <span className="text-[11px] font-medium text-text-tertiary">
                      {exercises.filter((e) =>
                        planned.some((p) => p.name.toLowerCase() === e.exercise_name.toLowerCase())
                      ).length}
                      /{planned.length}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mb-3 h-1 overflow-hidden rounded-full bg-surface-elevated">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${
                          (exercises.filter((e) =>
                            planned.some(
                              (p) => p.name.toLowerCase() === e.exercise_name.toLowerCase()
                            )
                          ).length /
                            planned.length) *
                          100
                        }%`,
                      }}
                      transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    {planned.map((p, i) => {
                      const done = exercises.some(
                        (e) => e.exercise_name.toLowerCase() === p.name.toLowerCase()
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 py-0.5"
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] ${
                              done
                                ? "bg-success"
                                : "border border-border"
                            }`}
                          >
                            {done && (
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-background"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-[13px] ${
                              done ? "text-text-tertiary line-through" : "text-text-primary"
                            }`}
                          >
                            {p.name}
                          </span>
                          <span className="ml-auto text-[11px] text-text-tertiary">
                            {p.target_sets}s
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Logged exercises */}
              {exercises.length > 0 && (
                <div className="mb-3">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                    Exercises
                  </span>
                  <div className="space-y-1.5">
                    {exercises.map((e, i) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between rounded-[var(--radius-button)] bg-surface-glass px-3 py-2"
                      >
                        <span className="text-[13px] font-medium text-text-primary">
                          {e.exercise_name}
                        </span>
                        <span className="stat-value text-[12px] text-text-secondary">
                          {[
                            e.sets && `${e.sets}s`,
                            e.reps && `${e.reps}r`,
                            e.weight && `${e.weight}${e.weight_unit}`,
                            e.duration_minutes && `${e.duration_minutes}m`,
                            e.distance_km && `${e.distance_km}km`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recovery */}
              {recovery.length > 0 && (
                <div>
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                    Recovery
                  </span>
                  <div className="space-y-1.5">
                    {recovery.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-[var(--radius-button)] bg-success-muted px-3 py-2"
                      >
                        <span className="text-[13px] font-medium text-success">
                          {ACTIVITY_LABELS[r.activity] || r.activity}
                        </span>
                        <span className="text-[12px] text-text-secondary">
                          {r.body_area}
                          {r.duration_minutes ? ` · ${r.duration_minutes}m` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {session.notes && (
                <p className="mt-3 text-[12px] italic text-text-tertiary">
                  {session.notes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      <div className="relative border-b border-border bg-surface">
        <div className="flex items-center justify-between px-4 pb-3 pt-3">
          <button
            onClick={() => router.push("/")}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] text-text-secondary transition-colors active:bg-surface-elevated"
            aria-label="Back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-[15px] font-semibold tracking-tight text-text-primary">
            History
          </h1>
          <div className="w-8" />
        </div>

        {/* Stats bar */}
        {!loading && sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center justify-between border-t border-border px-4 py-3"
          >
            <div className="flex items-center gap-5">
              <div>
                <p className="stat-value text-xl font-bold tracking-tight text-text-primary">
                  {streak}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
                  Streak
                </p>
              </div>
              <div className="h-6 w-px bg-border" />
              <div>
                <p className="stat-value text-xl font-bold tracking-tight text-text-primary">
                  {totalSessions}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
                  Sessions
                </p>
              </div>
              <div className="h-6 w-px bg-border" />
              <div>
                <p className="stat-value text-xl font-bold tracking-tight text-text-primary">
                  {totalExercises}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
                  Exercises
                </p>
              </div>
            </div>
            <WeekDots sessions={sessions} />
          </motion.div>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {loading && (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 w-24 rounded bg-surface-elevated" />
                    <div className="mt-2 flex gap-2">
                      <div className="h-4 w-14 rounded-full bg-surface-elevated" />
                      <div className="h-4 w-14 rounded-full bg-surface-elevated" />
                    </div>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-surface-elevated" />
                </div>
                <div className="mt-3 flex gap-4">
                  <div className="h-3 w-8 rounded bg-surface-elevated" />
                  <div className="h-3 w-12 rounded bg-surface-elevated" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-text-tertiary"
                >
                  <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M4.5 6.5v11M19.5 6.5v11" />
                </svg>
              </div>
              <p className="text-[15px] font-medium text-text-primary">
                No workouts yet
              </p>
              <p className="mt-1 text-[13px] text-text-tertiary">
                Start a session to begin tracking
              </p>
            </motion.div>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="pb-8">
            {weeks.map((week) => (
              <div key={week.label}>
                <div className="sticky top-0 z-10 bg-background/80 px-4 py-2 backdrop-blur-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                    {week.label}
                  </span>
                </div>
                <div className="space-y-2 px-4 pb-2">
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

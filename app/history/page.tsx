"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format, differenceInMinutes, parseISO } from "date-fns";
import type { WorkoutSession, ExerciseLog, RecoveryLog } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ACTIVITY_LABELS: Record<string, string> = {
  foam_rolling: "Foam Rolling",
  stretching: "Stretching",
  vyper: "Vyper Recovery",
  massage_gun: "Massage Gun",
  other: "Recovery",
};

function formatDuration(session: WorkoutSession): string | null {
  if (!session.started_at) return null;
  const end = session.completed_at || new Date().toISOString();
  const mins = differenceInMinutes(parseISO(end), parseISO(session.started_at));
  if (mins < 1) return null;
  return `${mins}m`;
}

function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) return "Today";
  if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) return "Yesterday";
  return format(date, "EEE, MMM d");
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("workout_sessions")
        .select("*, exercise_logs(*), recovery_logs(*)")
        .order("date", { ascending: false })
        .limit(30);

      setSessions((data as WorkoutSession[]) || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <button
          onClick={() => router.push("/")}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-text-primary">Workout History</h1>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {loading && (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
                <div className="h-4 w-28 rounded bg-surface-elevated" />
                <div className="mt-2 h-3 w-48 rounded bg-surface-elevated" />
              </div>
            ))}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center">
              <p className="text-text-secondary">No workouts yet.</p>
              <p className="mt-1 text-sm text-text-secondary/60">
                Start a session from the chat to begin tracking.
              </p>
            </div>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="space-y-2 p-4">
            {sessions.map((session) => {
              const exercises = (session.exercise_logs || []) as ExerciseLog[];
              const recovery = (session.recovery_logs || []) as RecoveryLog[];
              const planned = (session.planned_exercises || []);
              const dur = formatDuration(session);
              const isExpanded = expandedId === session.id;
              const isComplete = session.status === "completed";

              return (
                <button
                  key={session.id}
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="w-full rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left transition-colors active:bg-surface-elevated"
                >
                  {/* Summary row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-text-primary">
                        {formatDate(session.date)}
                      </span>
                      {dur && (
                        <span className="ml-2 text-xs text-text-secondary">{dur}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${isComplete ? "text-success" : "text-text-secondary"}`}
                      >
                        {isComplete ? "Done" : "In Progress"}
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-text-secondary transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Exercise summary (always visible) */}
                  {exercises.length > 0 && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {exercises.map((e) => e.exercise_name).join(", ")}
                    </p>
                  )}
                  {exercises.length === 0 && planned.length > 0 && (
                    <p className="mt-1 text-xs text-text-secondary">
                      Planned: {planned.map((p) => p.name).join(", ")}
                    </p>
                  )}

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-3 border-t border-border pt-3">
                      {/* Planned exercises with completion */}
                      {planned.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                            Plan
                          </p>
                          {planned.map((p, i) => {
                            const done = exercises.some(
                              (e) => e.exercise_name.toLowerCase() === p.name.toLowerCase()
                            );
                            return (
                              <div key={i} className="flex items-center gap-2 py-0.5">
                                <span
                                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                    done
                                      ? "border-success bg-success text-background"
                                      : "border-border"
                                  }`}
                                >
                                  {done && (
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </span>
                                <span className={`text-sm ${done ? "text-text-secondary line-through" : "text-text-primary"}`}>
                                  {p.name}
                                </span>
                                <span className="text-xs text-text-secondary">
                                  {p.target_sets}s
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Logged exercises */}
                      {exercises.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                            Logged
                          </p>
                          {exercises.map((e) => (
                            <div key={e.id} className="flex items-center justify-between py-0.5">
                              <span className="text-sm text-text-primary">{e.exercise_name}</span>
                              <span className="text-xs text-text-secondary">
                                {[
                                  e.sets && `${e.sets}s`,
                                  e.reps && `${e.reps}r`,
                                  e.weight && `${e.weight}${e.weight_unit}`,
                                  e.duration_minutes && `${e.duration_minutes}min`,
                                  e.distance_km && `${e.distance_km}km`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recovery */}
                      {recovery.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                            Recovery
                          </p>
                          {recovery.map((r) => (
                            <div key={r.id} className="flex items-center justify-between py-0.5">
                              <span className="text-sm text-primary">
                                {ACTIVITY_LABELS[r.activity] || r.activity}
                              </span>
                              <span className="text-xs text-text-secondary">
                                {r.body_area}{r.duration_minutes ? ` · ${r.duration_minutes}min` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {session.notes && (
                        <p className="mt-2 text-xs text-text-secondary italic">{session.notes}</p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

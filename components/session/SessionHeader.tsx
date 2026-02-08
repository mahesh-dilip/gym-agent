"use client";

import { useState, useEffect, useMemo } from "react";
import { useSharedState } from "@/lib/state/shared-state";
import { createClient } from "@/lib/supabase/client";
import { differenceInMinutes } from "date-fns";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

const ACTIVITY_LABELS: Record<string, string> = {
  foam_rolling: "Foam Rolling",
  stretching: "Stretching",
  vyper: "Vyper Recovery",
  massage_gun: "Massage Gun",
  other: "Recovery",
};

export function SessionHeader() {
  const { state } = useSharedState();
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const session = state.currentSession;

  useEffect(() => {
    if (session.status !== "in_progress" || !session.startedAt) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [session.status, session.startedAt]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (state.isLoading) {
    return (
      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="animate-pulse">
          <div className="h-4 w-32 rounded bg-surface-elevated" />
          <div className="mt-1 h-3 w-48 rounded bg-surface-elevated" />
        </div>
      </div>
    );
  }

  const planned = session.plannedExercises;
  const completedNames = new Set(
    session.completedExercises.map((e) => e.exercise_name.toLowerCase())
  );
  const exerciseCount = session.completedExercises.length;
  const recoveryCount = session.completedRecovery.length;
  const hasPlan = planned.length > 0;
  const hasContent = hasPlan || exerciseCount > 0 || recoveryCount > 0;

  const duration =
    session.startedAt
      ? differenceInMinutes(now, new Date(session.startedAt))
      : 0;

  const doneCount = hasPlan
    ? planned.filter((p) => completedNames.has(p.name.toLowerCase())).length
    : 0;

  const statusColor =
    session.status === "in_progress"
      ? "text-success"
      : session.status === "completed"
        ? "text-primary"
        : "text-text-tertiary";

  const statusLabel =
    session.status === "in_progress"
      ? "In Progress"
      : session.status === "completed"
        ? "Completed"
        : "No Session";

  return (
    <div className="border-b border-border bg-surface">
      <div className="flex items-center justify-between">
        <button
          onClick={() => hasContent && setExpanded(!expanded)}
          className="flex flex-1 items-center gap-3 px-4 py-3 text-left"
        >
          {/* Status dot */}
          <div className="relative">
            <div
              className={`h-2 w-2 shrink-0 rounded-full ${
                session.status === "in_progress"
                  ? "bg-success"
                  : session.status === "completed"
                    ? "bg-primary"
                    : "bg-text-tertiary/30"
              }`}
            />
            {session.status === "in_progress" && (
              <div className="absolute inset-0 animate-ping rounded-full bg-success/40" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-semibold ${statusColor}`}>
                {statusLabel}
              </span>
              {duration > 0 && (
                <span className="stat-value text-[11px] text-text-tertiary">
                  {duration}m
                </span>
              )}
            </div>
            {/* Progress bar under status when plan exists */}
            {hasPlan && session.status === "in_progress" && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-elevated">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(doneCount / planned.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
                <span className="stat-value text-[11px] font-medium text-text-tertiary">
                  {doneCount}/{planned.length}
                </span>
              </div>
            )}
            {!hasPlan && hasContent && (
              <span className="text-[11px] text-text-tertiary">
                {[
                  exerciseCount > 0 && `${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""}`,
                  recoveryCount > 0 && `${recoveryCount} recovery`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </div>
          {hasContent && (
            <motion.svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-text-tertiary"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </motion.svg>
          )}
        </button>

        <div className="mr-3 flex items-center gap-0.5">
          <button
            onClick={() => router.push("/history")}
            className="rounded-[var(--radius-button)] px-2.5 py-1.5 text-[12px] font-medium text-text-tertiary transition-colors active:bg-surface-elevated"
            aria-label="Workout history"
          >
            History
          </button>
          <button
            onClick={handleLogout}
            className="rounded-[var(--radius-button)] px-2.5 py-1.5 text-[12px] font-medium text-text-tertiary transition-colors active:bg-surface-elevated"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && hasContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-3">
              {hasPlan && (
                <div className="mb-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                    Workout Plan
                  </p>
                  {planned.map((p, i) => {
                    const done = completedNames.has(p.name.toLowerCase());
                    return (
                      <div key={i} className="flex items-center gap-2.5 py-1">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] ${
                            done ? "bg-success" : "border border-border"
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
              )}

              {session.completedExercises
                .filter(
                  (e) =>
                    !hasPlan ||
                    !planned.some(
                      (p) => p.name.toLowerCase() === e.exercise_name.toLowerCase()
                    )
                )
                .map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-1">
                    <span className="text-[13px] text-text-primary">
                      {e.exercise_name}
                    </span>
                    <span className="stat-value text-[11px] text-text-tertiary">
                      {[
                        e.sets && `${e.sets}s`,
                        e.reps && `${e.reps}r`,
                        e.weight && `${e.weight}${e.weight_unit}`,
                        e.duration_minutes && `${e.duration_minutes}m`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                ))}

              {session.completedRecovery.length > 0 && (
                <div className={hasPlan ? "mt-2 border-t border-border pt-2" : ""}>
                  {session.completedRecovery.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-1">
                      <span className="text-[13px] text-success">
                        {ACTIVITY_LABELS[r.activity] || r.activity}
                      </span>
                      <span className="text-[11px] text-text-tertiary">
                        {r.body_area}
                        {r.duration_minutes ? ` · ${r.duration_minutes}m` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

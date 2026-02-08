"use client";

import { useState, useEffect, useMemo } from "react";
import { useSharedState } from "@/lib/state/shared-state";
import { createClient } from "@/lib/supabase/client";
import { differenceInMinutes } from "date-fns";
import { useRouter } from "next/navigation";

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

  // Live duration counter — tick every 30s while in progress
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
  const hasContent =
    hasPlan || exerciseCount > 0 || recoveryCount > 0;

  const duration =
    session.startedAt
      ? differenceInMinutes(now, new Date(session.startedAt))
      : 0;

  const statusColor =
    session.status === "in_progress"
      ? "text-success"
      : session.status === "completed"
        ? "text-primary"
        : "text-text-secondary";

  const statusLabel =
    session.status === "in_progress"
      ? "In Progress"
      : session.status === "completed"
        ? "Completed"
        : "No Session";

  // Summary line for collapsed state
  const summaryParts: string[] = [];
  if (hasPlan) {
    summaryParts.push(
      `${exerciseCount}/${planned.length} done`
    );
  } else if (exerciseCount > 0) {
    summaryParts.push(
      `${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""}`
    );
  }
  if (recoveryCount > 0) {
    summaryParts.push(`${recoveryCount} recovery`);
  }
  if (duration > 0) {
    summaryParts.push(`${duration}m`);
  }

  return (
    <div className="border-b border-border bg-surface">
      <div className="flex items-center justify-between">
        <button
          onClick={() => hasContent && setExpanded(!expanded)}
          className="flex flex-1 items-center gap-3 px-4 py-3 text-left"
        >
          <div
            className={`h-2 w-2 shrink-0 rounded-full ${
              session.status === "in_progress"
                ? "bg-success animate-pulse"
                : session.status === "completed"
                  ? "bg-primary"
                  : "bg-text-secondary/30"
            }`}
          />
          <div className="min-w-0 flex-1">
            <span className={`text-sm font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            {summaryParts.length > 0 && (
              <span className="ml-2 text-xs text-text-secondary">
                {summaryParts.join(" · ")}
              </span>
            )}
          </div>
          {hasContent && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`shrink-0 text-text-secondary transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>

        {/* History + Logout */}
        <div className="mr-3 flex items-center gap-1">
          <button
            onClick={() => router.push("/history")}
            className="rounded-[var(--radius-button)] px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary active:bg-surface-elevated"
            aria-label="Workout history"
          >
            History
          </button>
          <button
            onClick={handleLogout}
            className="rounded-[var(--radius-button)] px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary active:bg-surface-elevated"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>

      {expanded && hasContent && (
        <div className="border-t border-border px-4 py-3">
          {/* Planned workout with completion indicators */}
          {hasPlan && (
            <div className="mb-2">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Workout Plan
              </p>
              {planned.map((p, i) => {
                const done = completedNames.has(p.name.toLowerCase());
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 py-1"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        done
                          ? "border-success bg-success text-background"
                          : "border-border"
                      }`}
                    >
                      {done && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`text-sm ${
                        done
                          ? "text-text-secondary line-through"
                          : "text-text-primary"
                      }`}
                    >
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

          {/* Logged exercises not in plan */}
          {session.completedExercises
            .filter(
              (e) =>
                !hasPlan ||
                !planned.some(
                  (p) =>
                    p.name.toLowerCase() === e.exercise_name.toLowerCase()
                )
            )
            .map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-1"
              >
                <span className="text-sm text-text-primary">
                  {e.exercise_name}
                </span>
                <span className="text-xs text-text-secondary">
                  {[
                    e.sets && `${e.sets}s`,
                    e.reps && `${e.reps}r`,
                    e.weight && `${e.weight}${e.weight_unit}`,
                    e.duration_minutes && `${e.duration_minutes}min`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            ))}

          {/* Recovery */}
          {session.completedRecovery.length > 0 && (
            <div className={hasPlan ? "mt-2 border-t border-border pt-2" : ""}>
              {session.completedRecovery.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-primary">
                    {ACTIVITY_LABELS[r.activity] || r.activity}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {r.body_area}
                    {r.duration_minutes ? ` · ${r.duration_minutes}min` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

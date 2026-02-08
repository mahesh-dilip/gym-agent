"use client";

import { useState } from "react";
import { useSharedState } from "@/lib/state/shared-state";
import { differenceInMinutes } from "date-fns";

export function SessionHeader() {
  const { state } = useSharedState();
  const [expanded, setExpanded] = useState(false);
  const session = state.currentSession;

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

  const exerciseCount = session.completedExercises.length;
  const recoveryCount = session.completedRecovery.length;
  const totalActivities = exerciseCount + recoveryCount;

  const duration = session.startedAt
    ? differenceInMinutes(new Date(), new Date(session.startedAt))
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

  return (
    <div className="border-b border-border bg-surface">
      <button
        onClick={() => totalActivities > 0 && setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-2 w-2 rounded-full ${
              session.status === "in_progress"
                ? "bg-success animate-pulse"
                : session.status === "completed"
                  ? "bg-primary"
                  : "bg-text-secondary/30"
            }`}
          />
          <div>
            <span className={`text-sm font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            {totalActivities > 0 && (
              <span className="ml-2 text-xs text-text-secondary">
                {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
                {recoveryCount > 0 && ` · ${recoveryCount} recovery`}
                {duration > 0 && ` · ${duration} min`}
              </span>
            )}
          </div>
        </div>
        {totalActivities > 0 && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-text-secondary transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {expanded && totalActivities > 0 && (
        <div className="border-t border-border px-4 py-3">
          {session.completedExercises.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-text-primary">{e.exercise_name}</span>
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
          {session.completedRecovery.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-primary">{r.activity}</span>
              <span className="text-xs text-text-secondary">
                {r.body_area}
                {r.duration_minutes ? ` · ${r.duration_minutes}min` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

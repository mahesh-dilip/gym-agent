"use client";

import { useState, useEffect } from "react";
import { useSharedState } from "@/lib/state/shared-state";
import { differenceInMinutes } from "date-fns";

type Props = {
  data: { notes?: string };
  isLoading: boolean;
};

export function SessionSummaryCard({ data, isLoading }: Props) {
  const { state, endSession } = useSharedState();
  const [ended, setEnded] = useState(false);
  const [ending, setEnding] = useState(false);

  const session = state.currentSession;
  const exercises = session.completedExercises;
  const recovery = session.completedRecovery;

  const duration = session.startedAt
    ? differenceInMinutes(new Date(), new Date(session.startedAt))
    : 0;

  async function handleEnd() {
    setEnding(true);
    await endSession(data.notes);
    setEnded(true);
    setEnding(false);
  }

  // Auto-end if not already ended
  useEffect(() => {
    if (session.status === "completed") {
      setEnded(true);
    }
  }, [session.status]);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-5 w-40 rounded bg-surface-elevated" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-full rounded bg-surface-elevated" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-success">
          {ended ? "session complete" : "session summary"}
        </span>
        {duration > 0 && (
          <span className="text-xs text-text-secondary">{duration} min</span>
        )}
      </div>

      <h3 className="text-base font-semibold text-text-primary">
        {ended ? "Session Complete" : "End Session?"}
      </h3>

      {exercises.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Exercises ({exercises.length})
          </p>
          <div className="space-y-1">
            {exercises.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{e.exercise_name}</span>
                <span className="text-text-secondary">
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
        </div>
      )}

      {recovery.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Recovery ({recovery.length})
          </p>
          <div className="space-y-1">
            {recovery.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{r.activity}</span>
                <span className="text-text-secondary">
                  {r.body_area}
                  {r.duration_minutes ? ` · ${r.duration_minutes}min` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.notes && (
        <p className="mt-3 text-sm text-text-secondary italic">{data.notes}</p>
      )}

      {!ended && (
        <button
          onClick={handleEnd}
          disabled={ending}
          className="mt-4 min-h-[44px] w-full rounded-[var(--radius-button)] bg-success px-4 py-3 text-sm font-medium text-background active:opacity-90 disabled:opacity-50"
        >
          {ending ? "Ending..." : "End Session"}
        </button>
      )}
    </div>
  );
}

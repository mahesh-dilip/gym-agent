"use client";

import { useEffect, useRef } from "react";
import { useSharedState } from "@/lib/state/shared-state";
import type { Goal, WorkoutSession } from "@/lib/supabase/types";

type Props = {
  data: {
    status: string;
    date?: string;
    session_id?: string;
    message?: string;
  };
  isLoading: boolean;
};

export function DeleteSessionCard({ data, isLoading }: Props) {
  const { state, dispatch } = useSharedState();
  const syncedRef = useRef(false);

  // Reset client state when today's session is deleted (preserve goals/history)
  useEffect(() => {
    if (!syncedRef.current && data?.status === "deleted") {
      syncedRef.current = true;
      const today = new Date().toISOString().split("T")[0];
      if (!data.date || data.date === today) {
        dispatch({
          type: "LOAD_CONTEXT",
          payload: {
            session: null,
            goals: state.userGoals as Goal[],
            history: state.recentHistory as WorkoutSession[],
          },
        });
      }
    }
  }, [data?.status, data?.date, dispatch, state.userGoals, state.recentHistory]);

  if (isLoading || !data) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-4 w-32 rounded bg-surface-elevated" />
        <div className="mt-2 h-3 w-48 rounded bg-surface-elevated" />
      </div>
    );
  }

  if (data.status === "not_found") {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-warning">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-[13px] text-text-secondary">
            {data.message || "No session found"}
          </span>
        </div>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-muted p-4">
        <p className="text-[13px] text-danger">
          {data.message || "Failed to delete session"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-danger">
          Session Deleted
        </span>
        <span className="text-[11px] text-text-tertiary">
          {data.date}
        </span>
      </div>
      <p className="mt-2 text-[13px] text-text-secondary">
        Session and all associated logs have been removed.
      </p>
    </div>
  );
}

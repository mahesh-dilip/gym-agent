"use client";

import { useState } from "react";
import { useSharedState } from "@/lib/state/shared-state";

type GoalData = {
  title: string;
  description: string;
  goal_type: "posture" | "strength" | "endurance" | "flexibility" | "body_comp";
  target: string;
};

type Props = {
  data: GoalData;
  isLoading: boolean;
};

const GOAL_TYPE_LABELS: Record<string, string> = {
  posture: "Posture",
  strength: "Strength",
  endurance: "Endurance",
  flexibility: "Flexibility",
  body_comp: "Body Composition",
};

export function GoalCard({ data, isLoading }: Props) {
  const { persistGoal } = useSharedState();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    const result = await persistGoal({
      title: data.title,
      description: data.description,
      goal_type: data.goal_type,
      target: data.target,
      status: "active",
    });
    setSaving(false);
    if (result) setSaved(true);
  }

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-4 w-32 rounded bg-surface-elevated" />
        <div className="mt-2 h-3 w-48 rounded bg-surface-elevated" />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          {GOAL_TYPE_LABELS[data.goal_type] || data.goal_type} goal
        </span>
        {saved && (
          <span className="text-xs font-medium text-success">Saved</span>
        )}
      </div>

      <h3 className="text-base font-semibold text-text-primary">{data.title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{data.description}</p>

      {data.target && (
        <div className="mt-2 rounded-[var(--radius-button)] bg-background px-3 py-2">
          <span className="text-xs text-text-secondary">Target: </span>
          <span className="text-xs text-text-primary">{data.target}</span>
        </div>
      )}

      {!saved && (
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="mt-3 min-h-[44px] w-full rounded-[var(--radius-button)] bg-primary px-4 py-3 text-sm font-medium text-white active:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Goal"}
        </button>
      )}
    </div>
  );
}

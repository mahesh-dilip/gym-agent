"use client";

import { useState } from "react";
import { useSharedState } from "@/lib/state/shared-state";

type RecoveryData = {
  activity: "foam_rolling" | "stretching" | "vyper" | "massage_gun" | "other";
  body_area: string;
  duration_minutes?: number;
  equipment?: string;
  notes?: string;
};

type Props = {
  data: RecoveryData;
  isLoading: boolean;
};

const ACTIVITY_LABELS: Record<string, string> = {
  foam_rolling: "Foam Rolling",
  stretching: "Stretching",
  vyper: "Vyper Recovery",
  massage_gun: "Massage Gun",
  other: "Recovery",
};

export function RecoveryLogCard({ data, isLoading }: Props) {
  const { persistRecovery } = useSharedState();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RecoveryData>(data);

  async function handleConfirm() {
    setSaving(true);
    const result = await persistRecovery({
      session_id: "",
      activity: form.activity,
      body_area: form.body_area,
      duration_minutes: form.duration_minutes ?? null,
      equipment: form.equipment ?? null,
      notes: form.notes ?? null,
    });
    setSaving(false);
    if (result) {
      setSaved(true);
      setEditing(false);
    }
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
          recovery
        </span>
        {saved && (
          <span className="text-xs font-medium text-success">Saved</span>
        )}
      </div>

      <h3 className="text-base font-semibold text-text-primary">
        {ACTIVITY_LABELS[form.activity] || form.activity}
      </h3>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Body Area</label>
            <input
              type="text"
              value={form.body_area}
              onChange={(e) => setForm({ ...form, body_area: e.target.value })}
              className="w-full rounded-[var(--radius-button)] border border-border bg-background px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Duration (min)</label>
            <input
              type="number"
              value={form.duration_minutes ?? ""}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full rounded-[var(--radius-button)] border border-border bg-background px-3 py-2 text-text-primary"
              inputMode="numeric"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setEditing(false)}
              className="min-h-[44px] flex-1 rounded-[var(--radius-button)] border border-border px-4 py-2 text-sm text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="min-h-[44px] flex-1 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-text-secondary">
            <span>{form.body_area}</span>
            {form.duration_minutes && (
              <>
                <span>·</span>
                <span>{form.duration_minutes} min</span>
              </>
            )}
            {form.equipment && (
              <>
                <span>·</span>
                <span>{form.equipment}</span>
              </>
            )}
          </div>
          {form.notes && (
            <p className="mt-1 text-xs text-text-secondary">{form.notes}</p>
          )}

          {!saved && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="min-h-[44px] flex-1 rounded-[var(--radius-button)] border border-border px-4 py-2 text-sm text-text-secondary active:bg-surface-elevated"
              >
                Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="min-h-[44px] flex-1 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-medium text-white active:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

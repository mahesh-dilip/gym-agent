"use client";

import { useState } from "react";
import { useSharedState } from "@/lib/state/shared-state";

type ExerciseData = {
  exercise_name: string;
  category: "strength" | "cardio" | "flexibility";
  sets?: number;
  reps?: number;
  weight?: number;
  weight_unit?: string;
  duration_minutes?: number;
  distance_km?: number;
  notes?: string;
};

type Props = {
  data: ExerciseData;
  isLoading: boolean;
};

export function ExerciseLogCard({ data, isLoading }: Props) {
  const { persistExercise } = useSharedState();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ExerciseData>(data);

  async function handleConfirm() {
    setSaving(true);
    const result = await persistExercise({
      session_id: "",
      exercise_name: form.exercise_name,
      category: form.category,
      sets: form.sets ?? null,
      reps: form.reps ?? null,
      weight: form.weight ?? null,
      weight_unit: form.weight_unit || "kg",
      duration_minutes: form.duration_minutes ?? null,
      distance_km: form.distance_km ?? null,
      notes: form.notes ?? null,
      order_index: null,
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

  const categoryIcon =
    form.category === "cardio" ? "cardio" : form.category === "flexibility" ? "flex" : "strength";

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {categoryIcon}
        </span>
        {saved && (
          <span className="text-xs font-medium text-success">Saved</span>
        )}
      </div>

      <h3 className="text-base font-semibold text-text-primary">
        {form.exercise_name}
      </h3>

      {editing ? (
        <div className="mt-3 space-y-3">
          {form.category === "strength" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-text-secondary">Sets</label>
                <input
                  type="number"
                  value={form.sets ?? ""}
                  onChange={(e) => setForm({ ...form, sets: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-[var(--radius-button)] border border-border bg-background px-3 py-2 text-text-primary"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-text-secondary">Reps</label>
                <input
                  type="number"
                  value={form.reps ?? ""}
                  onChange={(e) => setForm({ ...form, reps: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-[var(--radius-button)] border border-border bg-background px-3 py-2 text-text-primary"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-text-secondary">Weight</label>
                <input
                  type="number"
                  value={form.weight ?? ""}
                  onChange={(e) => setForm({ ...form, weight: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-[var(--radius-button)] border border-border bg-background px-3 py-2 text-text-primary"
                  inputMode="decimal"
                />
              </div>
            </div>
          )}
          {form.category === "cardio" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-text-secondary">Duration (min)</label>
                <input
                  type="number"
                  value={form.duration_minutes ?? ""}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-[var(--radius-button)] border border-border bg-background px-3 py-2 text-text-primary"
                  inputMode="decimal"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-text-secondary">Distance (km)</label>
                <input
                  type="number"
                  value={form.distance_km ?? ""}
                  onChange={(e) => setForm({ ...form, distance_km: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-[var(--radius-button)] border border-border bg-background px-3 py-2 text-text-primary"
                  inputMode="decimal"
                />
              </div>
            </div>
          )}
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
            {form.sets && <span>{form.sets} sets</span>}
            {form.sets && (form.reps || form.weight) && <span>·</span>}
            {form.reps && <span>{form.reps} reps</span>}
            {form.reps && form.weight && <span>·</span>}
            {form.weight && (
              <span>
                {form.weight} {form.weight_unit || "kg"}
              </span>
            )}
            {form.duration_minutes && <span>{form.duration_minutes} min</span>}
            {form.distance_km && <span>{form.distance_km} km</span>}
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

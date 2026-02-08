"use client";

import { useState, useEffect } from "react";
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
  const { state, persistExercise } = useSharedState();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ExerciseData>(data);

  // Hydrate: if this exercise is already in the DB, mark as saved
  useEffect(() => {
    if (
      state.currentSession.completedExercises.some(
        (e) => e.exercise_name === data.exercise_name
      )
    ) {
      setSaved(true);
    }
  }, [state.currentSession.completedExercises, data.exercise_name]);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
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
    } else {
      setError("FAILED TO SAVE. RETRY?");
    }
  }

  if (isLoading) {
    return (
      <div className="tech-card p-4 animate-pulse">
        <div className="h-4 w-20 bg-surface-elevated rounded mb-4" />
        <div className="h-6 w-48 bg-surface-elevated rounded mb-4" />
        <div className="flex gap-2">
          <div className="h-8 flex-1 bg-surface-elevated rounded" />
          <div className="h-8 flex-1 bg-surface-elevated rounded" />
        </div>
      </div>
    );
  }

  const categoryLabel = form.category.toUpperCase();
  const showDuration = form.category === "cardio" || form.category === "flexibility";
  const showDistance = form.category === "cardio";
  const showStrength = form.category === "strength";

  return (
    <div className={`tech-card overflow-hidden transition-all ${saved ? "border-success/30 bg-success-muted/5" : ""}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-surface-elevated/30 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
          {categoryLabel} LOG
        </span>
        {saved && (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_5px_var(--color-success)]" />
            <span className="text-[10px] font-mono text-success uppercase tracking-wider">SAVED</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-text-primary tracking-tight mb-4">
          {form.exercise_name}
        </h3>

        {/* Edit Form */}
        {(editing || !saved) && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {showStrength && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-tertiary uppercase tracking-wider block">SETS</label>
                    <input
                      type="number"
                      value={form.sets ?? ""}
                      onChange={(e) => setForm({ ...form, sets: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-transparent border-b border-border text-center py-2 font-mono text-lg focus:border-primary focus:outline-none transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-tertiary uppercase tracking-wider block">REPS</label>
                    <input
                      type="number"
                      value={form.reps ?? ""}
                      onChange={(e) => setForm({ ...form, reps: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-transparent border-b border-border text-center py-2 font-mono text-lg focus:border-primary focus:outline-none transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-tertiary uppercase tracking-wider block">KG</label>
                    <input
                      type="number"
                      value={form.weight ?? ""}
                      onChange={(e) => setForm({ ...form, weight: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-transparent border-b border-border text-center py-2 font-mono text-lg focus:border-primary focus:outline-none transition-colors"
                      placeholder="0"
                    />
                  </div>
                </>
              )}

              {showDuration && (
                <div className="space-y-1">
                  <label className="text-[10px] text-text-tertiary uppercase tracking-wider block">MINS</label>
                  <input
                    type="number"
                    value={form.duration_minutes ?? ""}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-transparent border-b border-border text-center py-2 font-mono text-lg focus:border-primary focus:outline-none transition-colors"
                    placeholder="0"
                  />
                </div>
              )}

              {showDistance && (
                <div className="space-y-1">
                  <label className="text-[10px] text-text-tertiary uppercase tracking-wider block">KM</label>
                  <input
                    type="number"
                    value={form.distance_km ?? ""}
                    onChange={(e) => setForm({ ...form, distance_km: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-transparent border-b border-border text-center py-2 font-mono text-lg focus:border-primary focus:outline-none transition-colors"
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {saved && (
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-3 text-xs font-bold text-text-secondary border border-border rounded hover:bg-surface-elevated transition-colors uppercase tracking-widest"
                >
                  CANCEL
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-3 text-xs font-bold text-white bg-primary rounded shadow-[0_0_15px_-4px_var(--color-primary)] hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
              >
                {saving ? "SAVING..." : (saved ? "UPDATE" : "CONFIRM LOG")}
              </button>
            </div>
            {error && <p className="text-xs text-danger font-mono text-center">{error}</p>}
          </div>
        )}

        {/* Read Only View */}
        {!editing && saved && (
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              {form.sets && (
                <div className="flex flex-col">
                  <span className="text-2xl font-mono leading-none">{form.sets}</span>
                  <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-1">SETS</span>
                </div>
              )}
              {form.reps && (
                <div className="flex flex-col">
                  <span className="text-2xl font-mono leading-none">{form.reps}</span>
                  <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-1">REPS</span>
                </div>
              )}
              {form.weight && (
                <div className="flex flex-col">
                  <span className="text-2xl font-mono leading-none">{form.weight}</span>
                  <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-1">KG</span>
                </div>
              )}
              {form.duration_minutes && (
                <div className="flex flex-col">
                  <span className="text-2xl font-mono leading-none">{form.duration_minutes}</span>
                  <span className="text-[9px] text-text-tertiary uppercase tracking-widest mt-1">MIN</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="p-2 text-text-tertiary hover:text-primary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import type { ExerciseLog, SetDetail } from "@/lib/supabase/types";

type SetRow = { set_number: number; weight: number | null; reps: number | null };

type QuickLogFormProps = {
  exerciseName: string;
  lastLog: ExerciseLog | null;
  defaultReps: number | null;
  targetSets: number | null;
  onSave: (exercise: {
    exercise_name: string;
    category: "strength" | "cardio" | "flexibility";
    sets: number;
    reps: number | null;
    weight: number | null;
    weight_unit: string;
    set_details: SetDetail[] | null;
  }) => void;
  onCancel: () => void;
};

export function QuickLogForm({
  exerciseName,
  lastLog,
  defaultReps,
  targetSets,
  onSave,
  onCancel,
}: QuickLogFormProps) {
  const lastSetDetails = lastLog?.set_details as SetRow[] | null;
  const hasVaryingSets = lastSetDetails && lastSetDetails.length > 0;

  // Initialize from last log or defaults
  const initSets = hasVaryingSets
    ? lastSetDetails.length
    : lastLog?.sets ?? targetSets ?? 3;
  const initReps = lastLog?.reps ?? defaultReps ?? 15;
  const initWeight = lastLog?.weight ?? null;
  const initUnit = lastLog?.weight_unit ?? "kg";

  const [mode, setMode] = useState<"uniform" | "per_set">(
    hasVaryingSets ? "per_set" : "uniform"
  );

  // Uniform mode state
  const [sets, setSets] = useState(initSets);
  const [reps, setReps] = useState(initReps);
  const [weight, setWeight] = useState(initWeight);
  const [weightUnit] = useState(initUnit);

  // Per-set mode state
  const [setRows, setSetRows] = useState<SetRow[]>(() => {
    if (hasVaryingSets) {
      return lastSetDetails.map((s) => ({ ...s }));
    }
    return Array.from({ length: initSets }, (_, i) => ({
      set_number: i + 1,
      weight: initWeight,
      reps: initReps,
    }));
  });

  const [saving, setSaving] = useState(false);

  const updateRow = useCallback(
    (idx: number, field: "weight" | "reps", delta: number) => {
      setSetRows((rows) =>
        rows.map((r, i) =>
          i === idx ? { ...r, [field]: Math.max(0, (r[field] ?? 0) + delta) } : r
        )
      );
    },
    []
  );

  const addSet = useCallback(() => {
    setSetRows((rows) => {
      const last = rows[rows.length - 1];
      return [
        ...rows,
        {
          set_number: rows.length + 1,
          weight: last?.weight ?? initWeight,
          reps: last?.reps ?? initReps,
        },
      ];
    });
  }, [initWeight, initReps]);

  const removeSet = useCallback(() => {
    setSetRows((rows) => (rows.length > 1 ? rows.slice(0, -1) : rows));
  }, []);

  function handleSave() {
    setSaving(true);

    if (mode === "per_set") {
      const maxWeight = Math.max(...setRows.map((r) => r.weight ?? 0));
      const repsMode = setRows[0]?.reps ?? initReps;
      onSave({
        exercise_name: exerciseName,
        category: "strength",
        sets: setRows.length,
        reps: repsMode,
        weight: maxWeight || null,
        weight_unit: weightUnit,
        set_details: setRows.map((r) => ({
          set_number: r.set_number,
          weight: r.weight,
          reps: r.reps,
        })),
      });
    } else {
      onSave({
        exercise_name: exerciseName,
        category: "strength",
        sets,
        reps,
        weight,
        weight_unit: weightUnit,
        set_details: null,
      });
    }
  }

  return (
    <div className="px-4 py-3 bg-surface border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
            QUICK_LOG
          </span>
          <h3 className="text-sm font-bold text-text-primary">
            {exerciseName}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode(mode === "uniform" ? "per_set" : "uniform")}
            className="text-[10px] font-mono text-text-tertiary hover:text-text-secondary border border-border-subtle px-2 py-1 rounded transition-colors"
          >
            {mode === "uniform" ? "PER-SET" : "UNIFORM"}
          </button>
        </div>
      </div>

      {mode === "uniform" ? (
        /* Uniform mode: single row */
        <div className="flex items-center gap-3 mb-3">
          <StepperField label="SETS" value={sets} onChange={setSets} min={1} />
          <StepperField label="REPS" value={reps} onChange={setReps} min={1} />
          <StepperField
            label={weightUnit.toUpperCase()}
            value={weight ?? 0}
            onChange={(v) => setWeight(v || null)}
            step={2.5}
            min={0}
          />
        </div>
      ) : (
        /* Per-set mode: rows */
        <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto">
          {setRows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-text-tertiary w-6 shrink-0">
                S{row.set_number}
              </span>
              <MiniStepper
                value={row.reps ?? 0}
                onInc={() => updateRow(idx, "reps", 1)}
                onDec={() => updateRow(idx, "reps", -1)}
                label="r"
              />
              <span className="text-text-tertiary text-xs">@</span>
              <MiniStepper
                value={row.weight ?? 0}
                onInc={() => updateRow(idx, "weight", 2.5)}
                onDec={() => updateRow(idx, "weight", -2.5)}
                label={weightUnit}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={addSet}
              className="text-[10px] font-mono text-primary hover:text-primary-hover border border-primary/20 px-2 py-1 rounded transition-colors"
            >
              + ADD SET
            </button>
            {setRows.length > 1 && (
              <button
                onClick={removeSet}
                className="text-[10px] font-mono text-text-tertiary hover:text-danger border border-border-subtle px-2 py-1 rounded transition-colors"
              >
                - REMOVE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 shadow-[0_0_15px_-3px_var(--color-primary)]"
        >
          {saving ? "SAVING..." : "SAVE"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2.5 border border-border bg-surface text-text-secondary text-xs font-bold uppercase tracking-widest rounded transition-all hover:border-text-secondary active:scale-[0.98]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

/* Stepper field for uniform mode */
function StepperField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-[9px] font-mono text-text-tertiary tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-8 h-8 flex items-center justify-center border border-border rounded text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors active:scale-95"
        >
          -
        </button>
        <span className="w-12 text-center text-sm font-bold font-mono text-text-primary">
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        <button
          onClick={() => onChange(value + step)}
          className="w-8 h-8 flex items-center justify-center border border-border rounded text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* Mini inline stepper for per-set rows */
function MiniStepper({
  value,
  onInc,
  onDec,
  label,
}: {
  value: number;
  onInc: () => void;
  onDec: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onDec}
        className="w-6 h-6 flex items-center justify-center border border-border rounded text-[10px] text-text-secondary hover:text-text-primary transition-colors active:scale-95"
      >
        -
      </button>
      <span className="w-10 text-center text-xs font-bold font-mono text-text-primary">
        {Number.isInteger(value) ? value : value.toFixed(1)}
      </span>
      <button
        onClick={onInc}
        className="w-6 h-6 flex items-center justify-center border border-border rounded text-[10px] text-text-secondary hover:text-text-primary transition-colors active:scale-95"
      >
        +
      </button>
      <span className="text-[9px] font-mono text-text-tertiary ml-0.5">
        {label}
      </span>
    </div>
  );
}

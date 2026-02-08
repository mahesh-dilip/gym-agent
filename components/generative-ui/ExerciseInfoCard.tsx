"use client";

import { useSharedState } from "@/lib/state/shared-state";

type ExerciseInfoData = {
  exercise_name: string;
  category: "strength" | "cardio" | "flexibility";
  primary_muscles: string[];
  secondary_muscles?: string[];
  form_cues: string[];
  common_mistakes: string[];
  recommended_sets?: number;
  recommended_reps?: string;
};

type Props = {
  data: ExerciseInfoData;
  isLoading: boolean;
};

export function ExerciseInfoCard({ data, isLoading }: Props) {
  const { state } = useSharedState();

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-card)] bg-surface p-4">
        <div className="h-4 w-32 rounded bg-surface-elevated" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-surface-elevated" />
          <div className="h-3 w-3/4 rounded bg-surface-elevated" />
        </div>
      </div>
    );
  }

  const categoryLabel =
    data.category === "cardio"
      ? "Cardio"
      : data.category === "flexibility"
        ? "Flexibility"
        : "Strength";

  // Check if this exercise is already in today's session
  const alreadyLogged = state.currentSession.completedExercises.some(
    (e) => e.exercise_name.toLowerCase() === data.exercise_name.toLowerCase()
  );

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      {/* Header */}
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {categoryLabel}
        </span>
        {data.recommended_sets && data.recommended_reps && (
          <span className="text-xs text-text-secondary">
            · {data.recommended_sets} x {data.recommended_reps}
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold text-text-primary">
        {data.exercise_name}
      </h3>

      {/* Muscles */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {data.primary_muscles.map((m) => (
          <span
            key={m}
            className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {m}
          </span>
        ))}
        {data.secondary_muscles?.map((m) => (
          <span
            key={m}
            className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-text-secondary"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Form cues */}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Form cues
        </p>
        <ul className="space-y-1">
          {data.form_cues.map((cue, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              {cue}
            </li>
          ))}
        </ul>
      </div>

      {/* Common mistakes */}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Avoid
        </p>
        <ul className="space-y-1">
          {data.common_mistakes.map((mistake, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
              {mistake}
            </li>
          ))}
        </ul>
      </div>

      {/* Already logged indicator */}
      {alreadyLogged && (
        <div className="mt-3 flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-success"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-xs font-medium text-success">
            Already logged today
          </span>
        </div>
      )}
    </div>
  );
}

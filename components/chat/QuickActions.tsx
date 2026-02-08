"use client";

import type { SessionStatus } from "@/lib/state/types";
import type { PlannedExercise, ExerciseLog } from "@/lib/supabase/types";

type QuickAction = { label: string; text: string };

type QuickActionsProps = {
  onAction: (text: string) => void;
  disabled: boolean;
  sessionStatus: SessionStatus;
  plannedExercises?: PlannedExercise[];
  completedExercises?: ExerciseLog[];
};

function getNextExercise(
  planned: PlannedExercise[],
  completed: ExerciseLog[]
): PlannedExercise | null {
  const doneNames = new Set(completed.map((e) => e.exercise_name.toLowerCase()));
  return planned.find((p) => !doneNames.has(p.name.toLowerCase())) ?? null;
}

function getActions(
  sessionStatus: SessionStatus,
  planned: PlannedExercise[],
  completed: ExerciseLog[]
): QuickAction[] {
  if (sessionStatus === "in_progress") {
    const actions: QuickAction[] = [];
    const next = getNextExercise(planned, completed);
    if (next) {
      actions.push({
        label: `Log ${next.name}`,
        text: `I did ${next.name}`,
      });
    }
    actions.push(
      { label: "What next?", text: "What should I do next?" },
      { label: "Log Recovery", text: "I want to log a recovery activity" },
      { label: "End Session", text: "I'm done for today" }
    );
    return actions;
  }
  return [
    { label: "What should I do?", text: "What should I do today?" },
    { label: "Set a Goal", text: "I want to set a fitness goal" },
  ];
}

export function QuickActions({
  onAction,
  disabled,
  sessionStatus,
  plannedExercises = [],
  completedExercises = [],
}: QuickActionsProps) {
  const actions = getActions(sessionStatus, plannedExercises, completedExercises);

  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 py-2 hide-scrollbar">
      {actions.map((action, i) => (
        <button
          key={action.label}
          onClick={() => onAction(action.text)}
          disabled={disabled}
          className={`shrink-0 rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[13px] font-medium transition-all active:scale-95 disabled:opacity-30 ${
            i === 0 && sessionStatus === "in_progress"
              ? "bg-primary-muted text-primary-hover border border-primary/20"
              : "border border-border bg-surface text-text-secondary hover:text-text-primary"
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

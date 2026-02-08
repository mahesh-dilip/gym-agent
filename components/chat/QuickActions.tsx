"use client";

import type { SessionStatus } from "@/lib/state/types";
import type { PlannedExercise, ExerciseLog } from "@/lib/supabase/types";

type QuickAction = { label: string; text: string; primary?: boolean };

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
        label: `LOG: ${next.name.toUpperCase()}`,
        text: `I did ${next.name}`,
        primary: true,
      });
    }
    actions.push(
      { label: "WHAT NEXT?", text: "What should I do next?" },
      { label: "LOG RECOVERY", text: "I want to log a recovery activity" },
      { label: "END SESSION", text: "I'm done for today" }
    );
    return actions;
  }
  return [
    { label: "SUGGEST WORKOUT", text: "What should I do today?" },
    { label: "SET GOAL", text: "I want to set a fitness goal" },
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
    <div className="flex gap-2 overflow-x-auto px-4 py-3 hide-scrollbar mask-linear-fade">
      {actions.map((action, i) => (
        <button
          key={action.label}
          onClick={() => onAction(action.text)}
          disabled={disabled}
          className={`shrink-0 rounded-[4px] px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase transition-all active:scale-95 disabled:opacity-30 border ${action.primary
              ? "bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.3)]"
              : "border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary"
            }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

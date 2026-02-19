"use client";

import type { SessionStatus } from "@/lib/state/types";
import type { PlannedExercise, ExerciseLog, WorkoutSession } from "@/lib/supabase/types";

type QuickAction =
  | { label: string; text: string; primary?: boolean; type: "action" }
  | { label: string; exerciseName: string; primary?: boolean; type: "quick_log" };

type QuickActionsProps = {
  onAction: (text: string) => void;
  onQuickLog?: (exerciseName: string) => void;
  disabled: boolean;
  sessionStatus: SessionStatus;
  plannedExercises?: PlannedExercise[];
  completedExercises?: ExerciseLog[];
  recentHistory?: WorkoutSession[];
};

function getRemainingExercises(
  planned: PlannedExercise[],
  completed: ExerciseLog[]
): PlannedExercise[] {
  const doneNames = new Set(completed.map((e) => e.exercise_name.toLowerCase()));
  return planned.filter((p) => !doneNames.has(p.name.toLowerCase()));
}

function getActions(
  sessionStatus: SessionStatus,
  planned: PlannedExercise[],
  completed: ExerciseLog[],
  recentHistory: WorkoutSession[],
  hasQuickLog: boolean
): QuickAction[] {
  if (sessionStatus === "in_progress") {
    const actions: QuickAction[] = [];
    const remaining = getRemainingExercises(planned, completed);

    if (hasQuickLog && remaining.length > 0) {
      // Show ALL remaining exercises as quick-log buttons
      remaining.forEach((ex, i) => {
        actions.push({
          label: `LOG: ${ex.name.toUpperCase()}`,
          exerciseName: ex.name,
          primary: i === 0,
          type: "quick_log",
        });
      });
    } else if (remaining.length > 0) {
      // Fallback: send as AI message
      actions.push({
        label: `LOG: ${remaining[0].name.toUpperCase()}`,
        text: `I did ${remaining[0].name}`,
        primary: true,
        type: "action",
      });
    }

    actions.push(
      { label: "END SESSION", text: "I'm done for today", type: "action" }
    );
    return actions;
  }

  const actions: QuickAction[] = [];

  // "Repeat Last" button when there's history and no active session
  if (sessionStatus === "not_started" && recentHistory.length > 0) {
    actions.push({
      label: "REPEAT LAST",
      text: "Repeat my last session",
      type: "action",
    });
  }

  actions.push(
    { label: "SUGGEST WORKOUT", text: "What should I do today?", type: "action" },
    { label: "SET GOAL", text: "I want to set a fitness goal", type: "action" }
  );
  return actions;
}

export function QuickActions({
  onAction,
  onQuickLog,
  disabled,
  sessionStatus,
  plannedExercises = [],
  completedExercises = [],
  recentHistory = [],
}: QuickActionsProps) {
  const actions = getActions(
    sessionStatus,
    plannedExercises,
    completedExercises,
    recentHistory,
    !!onQuickLog
  );

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 hide-scrollbar mask-linear-fade">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => {
            if (action.type === "quick_log" && onQuickLog) {
              onQuickLog(action.exerciseName);
            } else if (action.type === "action") {
              onAction(action.text);
            }
          }}
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

"use client";

import type { SessionStatus } from "@/lib/state/types";

type QuickActionsProps = {
  onAction: (text: string) => void;
  disabled: boolean;
  sessionStatus: SessionStatus;
};

function getActions(sessionStatus: SessionStatus) {
  if (sessionStatus === "in_progress") {
    return [
      { label: "What next?", text: "What should I do next?" },
      { label: "Log Recovery", text: "I want to log a recovery activity" },
      { label: "End Session", text: "I'm done for today" },
    ];
  }
  // not_started or completed
  return [
    { label: "What should I do?", text: "What should I do today?" },
    { label: "Set a Goal", text: "I want to set a fitness goal" },
  ];
}

export function QuickActions({ onAction, disabled, sessionStatus }: QuickActionsProps) {
  const actions = getActions(sessionStatus);

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 hide-scrollbar">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.text)}
          disabled={disabled}
          className="shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary active:bg-surface-elevated disabled:opacity-40"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

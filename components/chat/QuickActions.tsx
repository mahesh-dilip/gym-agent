"use client";

type QuickActionsProps = {
  onAction: (text: string) => void;
  disabled: boolean;
};

const ACTIONS = [
  { label: "What should I do?", text: "What should I do today?" },
  { label: "What next?", text: "What else should I do?" },
  { label: "End Session", text: "I'm done for today" },
];

export function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 hide-scrollbar">
      {ACTIONS.map((action) => (
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

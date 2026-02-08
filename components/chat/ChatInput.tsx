"use client";

import { useRef, useEffect } from "react";

type ChatInputProps = {
  input: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export function ChatInput({ input, onChange, onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Directly call onSubmit logic wrapper
      if (!input.trim() || isLoading) return;
      onSubmit();
    }
  }

  const hasText = input.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-end gap-3 px-4 pb-4 pt-2 w-full max-w-3xl mx-auto"
    >
      <div className="relative flex-1 group">
        <div className="absolute inset-0 rounded-lg bg-surface border border-border transition-all group-focus-within:border-primary/50 group-focus-within:shadow-[0_0_15px_-3px_var(--color-primary-muted)]" />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ENTER COMMAND..."
          rows={1}
          enterKeyHint="send"
          className="relative w-full resize-none bg-transparent px-4 py-3 text-[16px] font-medium text-text-primary placeholder:text-text-tertiary placeholder:text-[12px] placeholder:tracking-widest placeholder:uppercase focus:outline-none max-h-[120px]"
          disabled={isLoading}
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={!hasText || isLoading}
        className={`flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-lg transition-all border ${hasText && !isLoading
            ? "bg-primary border-primary text-white shadow-[0_0_15px_-3px_var(--color-primary)] active:scale-95"
            : "bg-surface border-border text-text-tertiary opacity-50 cursor-not-allowed"
          }`}
        aria-label="Execute"
      >
        {isLoading ? (
          <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </button>
    </form>
  );
}

"use client";

import { useRef } from "react";

type ChatInputProps = {
  input: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export function ChatInput({ input, onChange, onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }

  const hasText = input.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4 pb-3 pt-2">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            onChange(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type what you did..."
          rows={1}
          enterKeyHint="send"
          className="w-full resize-none rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-[16px] leading-snug text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-[border-color,box-shadow]"
          disabled={isLoading}
          autoComplete="off"
        />
      </div>
      <button
        type="submit"
        disabled={!hasText || isLoading}
        className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-card)] transition-all ${
          hasText && !isLoading
            ? "bg-primary text-white shadow-[0_0_20px_-4px_var(--color-glow)] active:scale-95"
            : "bg-surface-elevated text-text-tertiary"
        }`}
        aria-label="Send message"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}

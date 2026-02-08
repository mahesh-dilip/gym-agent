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

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4 pb-3 pt-2">
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
        className="flex-1 resize-none rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-[16px] leading-snug text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
        disabled={isLoading}
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-30"
        aria-label="Send message"
      >
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
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}

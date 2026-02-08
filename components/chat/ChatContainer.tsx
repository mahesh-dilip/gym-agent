"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useRef, useEffect, useState, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { useSharedState } from "@/lib/state/shared-state";

type Props = {
  initialMessages: UIMessage[];
};

export function ChatContainer({ initialMessages }: Props) {
  const { state } = useSharedState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages.length > 0 ? initialMessages : undefined,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (messages.length !== prevLengthRef.current) {
      el.scrollTop = el.scrollHeight;
      prevLengthRef.current = messages.length;
    } else {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (gap < 150) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }, [input, isLoading, sendMessage]);

  function handleQuickAction(text: string) {
    if (isLoading) return;
    sendMessage({ text });
  }

  const session = state.currentSession;
  const hasActiveSession = session.status === "in_progress";
  const hasPlan = session.plannedExercises.length > 0;
  const hasExercises = session.completedExercises.length > 0;
  const showRecovery =
    messages.length === 0 &&
    !state.isLoading &&
    hasActiveSession &&
    (hasPlan || hasExercises);

  const doneCount = hasPlan
    ? session.plannedExercises.filter((p) =>
        session.completedExercises.some(
          (e) => e.exercise_name.toLowerCase() === p.name.toLowerCase()
        )
      ).length
    : 0;

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="scroll-container hide-scrollbar flex-1 overflow-y-auto px-4 pb-4 pt-2"
      >
        {/* Empty state */}
        {messages.length === 0 && !state.isLoading && !showRecovery && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-primary"
                >
                  <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M4.5 6.5v11M19.5 6.5v11" />
                </svg>
              </div>
              <p className="text-[16px] font-semibold tracking-tight text-text-primary">
                Ready to train?
              </p>
              <p className="mt-1 text-[13px] text-text-tertiary">
                Tell me what you did or ask what to do next.
              </p>
            </div>
          </div>
        )}

        {/* Session recovery */}
        {showRecovery && (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="relative">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <div className="absolute inset-0 animate-ping rounded-full bg-success/40" />
                  </div>
                  <p className="text-[14px] font-semibold text-text-primary">
                    Session in progress
                  </p>
                </div>

                {hasPlan && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                        Your plan
                      </p>
                      <span className="stat-value text-[11px] font-medium text-text-tertiary">
                        {doneCount}/{session.plannedExercises.length}
                      </span>
                    </div>
                    <div className="mb-3 h-1 overflow-hidden rounded-full bg-surface-elevated">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${(doneCount / session.plannedExercises.length) * 100}%`,
                        }}
                      />
                    </div>
                    {session.plannedExercises.map((p, i) => {
                      const done = session.completedExercises.some(
                        (e) =>
                          e.exercise_name.toLowerCase() ===
                          p.name.toLowerCase()
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 py-0.5"
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] ${
                              done
                                ? "bg-success"
                                : "border border-border"
                            }`}
                          >
                            {done && (
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-background"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-[13px] ${
                              done
                                ? "text-text-tertiary line-through"
                                : "text-text-primary"
                            }`}
                          >
                            {p.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!hasPlan && hasExercises && (
                  <div className="mb-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                      Logged so far
                    </p>
                    <p className="text-[13px] text-text-secondary">
                      {session.completedExercises
                        .map((e) => e.exercise_name)
                        .join(", ")}
                    </p>
                  </div>
                )}

                <button
                  onClick={() =>
                    handleQuickAction("What should I do next?")
                  }
                  disabled={isLoading}
                  className="w-full rounded-[var(--radius-button)] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  Continue workout
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="mb-3 flex items-start">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="mb-3 flex items-start">
            <div className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-muted px-4 py-3">
              <p className="text-[13px] text-danger">
                {error?.message || "Something went wrong."}
              </p>
              <button
                onClick={() => {
                  const lastMsg = [...messages]
                    .reverse()
                    .find((m) => m.role === "user");
                  if (lastMsg) {
                    const text = lastMsg.parts
                      ?.filter(
                        (p): p is { type: "text"; text: string } =>
                          p.type === "text"
                      )
                      .map((p) => p.text)
                      .join(" ");
                    if (text) sendMessage({ text });
                  }
                }}
                className="mt-1.5 text-[13px] font-medium text-danger underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="shrink-0 border-t border-border bg-background safe-bottom">
        <QuickActions
          onAction={handleQuickAction}
          disabled={isLoading}
          sessionStatus={state.currentSession.status}
          plannedExercises={state.currentSession.plannedExercises}
          completedExercises={state.currentSession.completedExercises}
        />
        <ChatInput
          input={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

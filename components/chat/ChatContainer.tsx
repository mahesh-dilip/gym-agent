"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { useSharedState } from "@/lib/state/shared-state";

const STORAGE_KEY_PREFIX = "gym-chat-";
const MAX_STORED_MESSAGES = 50;

function getChatStorageKey() {
  return STORAGE_KEY_PREFIX + format(new Date(), "yyyy-MM-dd");
}

/** Remove chat keys older than 2 days to avoid localStorage bloat */
function cleanOldChatKeys() {
  try {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const cutoff = format(twoDaysAgo, "yyyy-MM-dd");

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const dateStr = key.replace(STORAGE_KEY_PREFIX, "");
        if (dateStr < cutoff) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

export function ChatContainer() {
  const { state } = useSharedState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const [input, setInput] = useState("");

  // Load persisted messages for today + clean old keys
  const [storedMessages] = useState(() => {
    if (typeof window === "undefined") return undefined;
    cleanOldChatKeys();
    try {
      const stored = localStorage.getItem(getChatStorageKey());
      return stored ? JSON.parse(stored) : undefined;
    } catch {
      return undefined;
    }
  });

  const { messages, sendMessage, status, error } = useChat({
    messages: storedMessages,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Persist messages to localStorage (limited to last N messages)
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const toStore = messages.slice(-MAX_STORED_MESSAGES);
        localStorage.setItem(getChatStorageKey(), JSON.stringify(toStore));
      } catch {
        // Storage full — try trimming more aggressively
        try {
          const minimal = messages.slice(-10);
          localStorage.setItem(getChatStorageKey(), JSON.stringify(minimal));
        } catch {
          // Give up on persistence
        }
      }
    }
  }, [messages]);

  // Smart auto-scroll: always on new message, only if near bottom during streaming
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

  // Determine if we should show session recovery
  const session = state.currentSession;
  const hasActiveSession = session.status === "in_progress";
  const hasPlan = session.plannedExercises.length > 0;
  const hasExercises = session.completedExercises.length > 0;
  const showRecovery =
    messages.length === 0 &&
    !state.isLoading &&
    hasActiveSession &&
    (hasPlan || hasExercises);

  return (
    <div className="flex h-full flex-col">
      {/* Chat messages area */}
      <div
        ref={scrollRef}
        className="scroll-container hide-scrollbar flex-1 overflow-y-auto px-4 pb-4 pt-2"
      >
        {/* Default empty state — no session */}
        {messages.length === 0 && !state.isLoading && !showRecovery && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-text-primary">
                Ready to train?
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Tell me what you did or ask what to do next.
              </p>
            </div>
          </div>
        )}

        {/* Session recovery state — chat lost but session exists */}
        {showRecovery && (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <p className="text-sm font-medium text-text-primary">
                    Session in progress
                  </p>
                </div>

                {hasPlan && (
                  <div className="mb-3">
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                      Your plan
                    </p>
                    {session.plannedExercises.map((p, i) => {
                      const done = session.completedExercises.some(
                        (e) =>
                          e.exercise_name.toLowerCase() === p.name.toLowerCase()
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 py-0.5"
                        >
                          <span
                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                              done
                                ? "border-success bg-success text-background"
                                : "border-border"
                            }`}
                          >
                            {done && (
                              <svg
                                width="8"
                                height="8"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          <span
                            className={`text-sm ${
                              done
                                ? "text-text-secondary line-through"
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
                  <div className="mb-3">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                      Logged so far
                    </p>
                    <p className="text-sm text-text-secondary">
                      {session.completedExercises
                        .map((e) => e.exercise_name)
                        .join(", ")}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleQuickAction("What should I do next?")}
                  disabled={isLoading}
                  className="w-full rounded-[var(--radius-button)] bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors active:bg-primary/80 disabled:opacity-40"
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

        {/* Loading dots */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="mb-3 flex items-start gap-2">
            <div className="rounded-[var(--radius-card)] bg-surface px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {status === "error" && (
          <div className="mb-3 flex items-start">
            <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/10 px-4 py-3">
              <p className="text-sm text-danger">
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
                className="mt-2 text-sm font-medium text-danger underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom area: quick actions + input */}
      <div className="shrink-0 border-t border-border bg-background safe-bottom">
        <QuickActions
          onAction={handleQuickAction}
          disabled={isLoading}
          sessionStatus={state.currentSession.status}
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

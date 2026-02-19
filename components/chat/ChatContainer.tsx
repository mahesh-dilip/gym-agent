"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useRef, useEffect, useState, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { QuickLogForm } from "./QuickLogForm";
import { useSharedState } from "@/lib/state/shared-state";
import { saveChatClient } from "@/lib/chat-store-client";
import { getLastLogForExercise } from "@/lib/get-last-exercise-log";
import type { ExerciseLog, SetDetail } from "@/lib/supabase/types";

type Props = {
  initialMessages: UIMessage[];
};

export function ChatContainer({ initialMessages }: Props) {
  const { state, persistExercise } = useSharedState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const [input, setInput] = useState("");
  const [quickLogExercise, setQuickLogExercise] = useState<string | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages.length > 0 ? initialMessages : undefined,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Eagerly save: on new user message, and when AI response completes
  const prevStatusRef = useRef(status);
  const lastSavedLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];
    const statusChanged = prevStatusRef.current !== status;
    prevStatusRef.current = status;

    // Save when: new user message appears
    if (last.role === "user" && messages.length !== lastSavedLengthRef.current) {
      lastSavedLengthRef.current = messages.length;
      saveChatClient(messages);
      return;
    }

    // Save when: AI response stream finishes (status transitions to "ready")
    if (statusChanged && status === "ready") {
      lastSavedLengthRef.current = messages.length;
      saveChatClient(messages);
    }
  }, [messages, status]);

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

  const handleQuickLog = useCallback((exerciseName: string) => {
    setQuickLogExercise(exerciseName);
  }, []);

  const handleQuickLogSave = useCallback(
    async (exercise: {
      exercise_name: string;
      category: "strength" | "cardio" | "flexibility";
      sets: number;
      reps: number | null;
      weight: number | null;
      weight_unit: string;
      set_details: SetDetail[] | null;
    }) => {
      await persistExercise({
        session_id: state.currentSession.id || "",
        exercise_name: exercise.exercise_name,
        category: exercise.category,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        weight_unit: exercise.weight_unit,
        duration_minutes: null,
        distance_km: null,
        notes: null,
        order_index: state.currentSession.completedExercises.length,
        set_details: exercise.set_details,
      });
      setQuickLogExercise(null);
    },
    [persistExercise, state.currentSession.id, state.currentSession.completedExercises.length]
  );

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

  // Quick log: look up last log and target sets for the exercise
  const quickLogLastLog = quickLogExercise
    ? getLastLogForExercise(quickLogExercise, state.recentHistory) ||
      // Also check today's completed exercises
      (state.currentSession.completedExercises.find(
        (e) => e.exercise_name.toLowerCase() === quickLogExercise.toLowerCase()
      ) as ExerciseLog | undefined) ||
      null
    : null;

  const quickLogTargetSets = quickLogExercise
    ? session.plannedExercises.find(
        (p) => p.name.toLowerCase() === quickLogExercise.toLowerCase()
      )?.target_sets ?? null
    : null;

  const defaultReps = state.preferences.default_reps ?? null;

  return (
    <div className="flex h-full flex-col relative bg-background">
      <div
        ref={scrollRef}
        className="scroll-container hide-scrollbar flex-1 overflow-y-auto px-4 pb-4 pt-6"
      >
        {/* Empty state */}
        {messages.length === 0 && !state.isLoading && !showRecovery && (
          <div className="flex h-full flex-col items-center justify-center opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
            <div className="text-center max-w-[280px]">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-surface/50">
                <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--color-primary)]" />
              </div>
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-text-primary">
                System Ready
              </p>
              <p className="mt-2 text-xs text-text-tertiary font-mono">
                Awaiting input...
              </p>

              <div className="mt-8 grid grid-cols-1 gap-2 w-full">
                <button
                  onClick={() => handleQuickAction("What should I do today?")}
                  className="w-full text-xs text-text-secondary hover:text-primary transition-all border border-border-subtle bg-surface hover:bg-surface-elevated/80 px-4 py-3 rounded-lg flex items-center justify-between group"
                >
                  <span>Start Workout</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
                <button
                  onClick={() => handleQuickAction("I want to set a goal")}
                  className="w-full text-xs text-text-secondary hover:text-primary transition-all border border-border-subtle bg-surface hover:bg-surface-elevated/80 px-4 py-3 rounded-lg flex items-center justify-between group"
                >
                  <span>Calibrate Goals</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session recovery */}
        {showRecovery && (
          <div className="flex h-full items-center justify-center p-4">
            <div className="w-full max-w-sm tech-card relative overflow-hidden group border-l-2 border-l-primary bg-surface/50 backdrop-blur-sm">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] font-black text-6xl text-text-primary select-none pointer-events-none">
                RESUME
              </div>

              <div className="relative z-10 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  <p className="text-xs font-mono text-success uppercase tracking-widest">
                    Session Active
                  </p>
                </div>

                {hasPlan ? (
                  <div className="mb-8">
                    <div className="flex justify-between items-end mb-3">
                      <span className="text-3xl font-bold font-mono tracking-tighter text-text-primary">{doneCount}</span>
                      <span className="text-xs text-text-tertiary mb-1.5 font-mono tracking-wider">/ {session.plannedExercises.length} COMPLETE</span>
                    </div>
                    <div className="h-0.5 w-full bg-surface-elevated overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500 will-change-[width]" style={{ width: `${(doneCount / session.plannedExercises.length) * 100}%` }} />
                    </div>
                  </div>
                ) : (hasExercises && (
                  <div className="mb-8">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Recent Activity</p>
                    <div className="flex flex-wrap gap-2">
                      {session.completedExercises.slice(-3).map((e, i) => (
                        <span key={i} className="text-xs border border-border px-2 py-1 rounded text-text-secondary bg-surface-elevated/50">
                          {e.exercise_name}
                        </span>
                      ))}
                      {session.completedExercises.length > 3 && (
                        <span className="text-xs border border-border px-2 py-1 rounded text-text-tertiary">
                          +{session.completedExercises.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => handleQuickAction("What should I do next?")}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-xs font-bold uppercase tracking-[0.15em] transition-all rounded-sm active:scale-[0.98]"
                >
                  Continue Session <span className="text-[10px] opacity-70 ml-1">↵</span>
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
          <div className="mb-6 flex items-start w-full animate-pulse">
            <div className="flex items-center gap-2 px-2">
              <div className="h-1 w-1 bg-text-tertiary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-1 w-1 bg-text-tertiary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-1 w-1 bg-text-tertiary rounded-full animate-bounce"></div>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="mb-6 flex items-start">
            <div className="tech-card border-danger/50 bg-danger-muted/10 px-4 py-3 text-danger border-l-2 border-l-danger">
              <div className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <p className="text-xs font-mono font-bold tracking-wider">SYSTEM_ERROR</p>
              </div>
              <p className="text-xs text-danger/80 mb-3 ml-6">{error?.message || "Execution failed."}</p>
              <button
                onClick={() => {
                  const lastMsg = [...messages].reverse().find((m) => m.role === "user");
                  if (lastMsg && lastMsg.parts) {
                    const text = lastMsg.parts
                      .filter((p): p is { type: "text"; text: string } => p.type === "text")
                      .map((p) => p.text)
                      .join(" ");
                    if (text) sendMessage({ text });
                  }
                }}
                className="text-xs font-bold underline decoration-danger/50 ml-6 hover:text-white transition-colors"
              >
                RETRY_LAST_COMMAND
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom z-20 shadow-[0_-1px_20px_rgba(0,0,0,0.2)]">
        {quickLogExercise ? (
          <QuickLogForm
            exerciseName={quickLogExercise}
            lastLog={quickLogLastLog}
            defaultReps={defaultReps}
            targetSets={quickLogTargetSets}
            onSave={handleQuickLogSave}
            onCancel={() => setQuickLogExercise(null)}
          />
        ) : (
          <>
            <QuickActions
              onAction={handleQuickAction}
              onQuickLog={handleQuickLog}
              disabled={isLoading}
              sessionStatus={state.currentSession.status}
              plannedExercises={state.currentSession.plannedExercises}
              completedExercises={state.currentSession.completedExercises}
              recentHistory={state.recentHistory}
            />
            <ChatInput
              input={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { saveChatClientWithId, loadChatClient } from "@/lib/chat-store-client";
import { createClient } from "@/lib/supabase/client";

const COACH_QUICK_ACTIONS = [
  { label: "REVIEW GOALS", text: "Review my current goals and progress" },
  { label: "ANALYZE PROGRESS", text: "Analyze my training progress" },
  { label: "SET A GOAL", text: "I want to set a new fitness goal" },
];

export function CoachContainer() {
  const [coachChatId, setCoachChatId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const [input, setInput] = useState("");

  // Load coach chat ID and messages on mount
  useEffect(() => {
    async function loadCoach() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const chatId = `${user.id}-coach`;
      setCoachChatId(chatId);

      const msgs = await loadChatClient(chatId);
      setInitialMessages(msgs);
    }
    loadCoach();
  }, []);

  const coachTransport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat?mode=coach" }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({
    transport: coachTransport,
    messages: initialMessages && initialMessages.length > 0 ? initialMessages : undefined,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Save messages
  const prevStatusRef = useRef(status);
  const lastSavedLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length === 0 || !coachChatId) return;

    const last = messages[messages.length - 1];
    const statusChanged = prevStatusRef.current !== status;
    prevStatusRef.current = status;

    if (last.role === "user" && messages.length !== lastSavedLengthRef.current) {
      lastSavedLengthRef.current = messages.length;
      saveChatClientWithId(coachChatId, messages);
      return;
    }

    if (statusChanged && status === "ready") {
      lastSavedLengthRef.current = messages.length;
      saveChatClientWithId(coachChatId, messages);
    }
  }, [messages, status, coachChatId]);

  // Auto-scroll
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

  // Loading state while fetching initial messages
  if (initialMessages === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col relative bg-background">
      <div
        ref={scrollRef}
        className="scroll-container hide-scrollbar flex-1 overflow-y-auto px-4 pb-4 pt-6"
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
            <div className="text-center max-w-[280px]">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-primary/30 bg-primary/5">
                <div className="h-2 w-2 bg-primary rounded-full shadow-[0_0_12px_var(--color-primary)]" />
              </div>
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-text-primary">
                Coach Mode
              </p>
              <p className="mt-2 text-xs text-text-tertiary font-mono leading-relaxed">
                Your personal coach. Ask about goals, training philosophy, or long-term planning.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-2 w-full">
                {COACH_QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.text)}
                    className="w-full text-xs text-text-secondary hover:text-primary transition-all border border-border-subtle bg-surface hover:bg-surface-elevated/80 px-4 py-3 rounded-lg flex items-center justify-between group"
                  >
                    <span>{action.label}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                ))}
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
            </div>
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom z-20 shadow-[0_-1px_20px_rgba(0,0,0,0.2)]">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 hide-scrollbar mask-linear-fade">
          {COACH_QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.text)}
              disabled={isLoading}
              className="shrink-0 rounded-[4px] px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase transition-all active:scale-95 disabled:opacity-30 border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary"
            >
              {action.label}
            </button>
          ))}
        </div>
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

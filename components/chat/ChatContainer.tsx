"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { useSharedState } from "@/lib/state/shared-state";

export function ChatContainer() {
  const { state } = useSharedState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat();

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }, [input, isLoading, sendMessage]);

  function handleQuickAction(text: string) {
    sendMessage({ text });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat messages area */}
      <div
        ref={scrollRef}
        className="scroll-container hide-scrollbar flex-1 overflow-y-auto px-4 pb-4 pt-2"
      >
        {messages.length === 0 && !state.isLoading && (
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

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

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
      </div>

      {/* Bottom area: quick actions + input */}
      <div className="shrink-0 border-t border-border bg-background safe-bottom">
        <QuickActions onAction={handleQuickAction} disabled={isLoading} />
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

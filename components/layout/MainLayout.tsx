"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import type { UIMessage } from "ai";
import { ChatContainer } from "@/components/chat/ChatContainer";

const CoachContainer = lazy(() =>
  import("@/components/chat/CoachContainer").then((mod) => ({
    default: mod.CoachContainer,
  }))
);

type Tab = "session" | "coach";

type MainLayoutProps = {
  initialMessages: UIMessage[];
};

export function MainLayout({ initialMessages }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem("gym-tab") as Tab) || "session";
    }
    return "session";
  });

  useEffect(() => {
    sessionStorage.setItem("gym-tab", activeTab);
  }, [activeTab]);

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-border bg-background/95 backdrop-blur-xl">
        <button
          onClick={() => setActiveTab("session")}
          className={`flex-1 py-2.5 text-[10px] font-mono uppercase tracking-[0.2em] transition-all relative ${
            activeTab === "session"
              ? "text-text-primary"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          Session
          {activeTab === "session" && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-primary shadow-[0_0_8px_var(--color-primary)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("coach")}
          className={`flex-1 py-2.5 text-[10px] font-mono uppercase tracking-[0.2em] transition-all relative ${
            activeTab === "coach"
              ? "text-text-primary"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          Coach
          {activeTab === "coach" && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-primary shadow-[0_0_8px_var(--color-primary)]" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "session" ? (
          <ChatContainer initialMessages={initialMessages} />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            }
          >
            <CoachContainer />
          </Suspense>
        )}
      </div>
    </div>
  );
}

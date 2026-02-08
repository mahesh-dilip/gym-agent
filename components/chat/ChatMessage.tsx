"use client";

import type { UIMessage } from "ai";
import { ExerciseLogCard } from "@/components/generative-ui/ExerciseLogCard";
import { RecoveryLogCard } from "@/components/generative-ui/RecoveryLogCard";
import { WorkoutPlanCard } from "@/components/generative-ui/WorkoutPlanCard";
import { SessionSummaryCard } from "@/components/generative-ui/SessionSummaryCard";
import { GoalCard } from "@/components/generative-ui/GoalCard";

function getToolComponent(toolName: string, input: unknown, isLoading: boolean) {
  const data = input as Record<string, unknown>;
  switch (toolName) {
    case "log_exercise":
      return <ExerciseLogCard data={data as never} isLoading={isLoading} />;
    case "log_recovery":
      return <RecoveryLogCard data={data as never} isLoading={isLoading} />;
    case "suggest_workout":
      return <WorkoutPlanCard data={data as never} isLoading={isLoading} />;
    case "end_session":
      return <SessionSummaryCard data={data as never} isLoading={isLoading} />;
    case "set_goal":
      return <GoalCard data={data as never} isLoading={isLoading} />;
    default:
      return null;
  }
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[90%] ${isUser ? "" : "w-full"}`}>
        {message.parts.map((part, i) => {
          if (part.type === "text" && part.text.trim()) {
            return (
              <div
                key={i}
                className={`rounded-[var(--radius-card)] px-4 py-3 ${
                  isUser
                    ? "bg-primary text-white"
                    : "bg-surface text-text-primary"
                } ${i > 0 ? "mt-2" : ""}`}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {part.text}
                </p>
              </div>
            );
          }

          // Handle typed tool parts (type: "tool-{name}") and dynamic tool parts
          if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
            const toolName = part.type === "dynamic-tool"
              ? (part as { toolName: string }).toolName
              : part.type.replace("tool-", "");

            const isToolLoading = "state" in part &&
              (part.state === "input-streaming");

            const input = "input" in part ? part.input : undefined;

            const component = getToolComponent(toolName, input, isToolLoading);
            if (component) {
              return (
                <div key={i} className={i > 0 ? "mt-2" : ""}>
                  {component}
                </div>
              );
            }
          }

          return null;
        })}
      </div>
    </div>
  );
}

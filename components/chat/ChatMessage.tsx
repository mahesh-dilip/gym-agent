"use client";

import type { ReactNode } from "react";
import type { UIMessage } from "ai";
import { ExerciseLogCard } from "@/components/generative-ui/ExerciseLogCard";
import { RecoveryLogCard } from "@/components/generative-ui/RecoveryLogCard";
import { WorkoutPlanCard } from "@/components/generative-ui/WorkoutPlanCard";
import { SessionSummaryCard } from "@/components/generative-ui/SessionSummaryCard";
import { GoalCard } from "@/components/generative-ui/GoalCard";
import { BackfillCard } from "@/components/generative-ui/BackfillCard";
import { ExerciseInfoCard } from "@/components/generative-ui/ExerciseInfoCard";
import { ProgressCard } from "@/components/generative-ui/ProgressCard";

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
    case "backfill_workout":
      return <BackfillCard data={data as never} isLoading={isLoading} />;
    case "exercise_info":
      return <ExerciseInfoCard data={data as never} isLoading={isLoading} />;
    case "show_progress":
      return <ProgressCard data={data as never} isLoading={isLoading} />;
    default:
      return null;
  }
}

/** Lightweight inline markdown: **bold**, *italic*, `code` */
function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((segment, i) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {segment.slice(2, -2)}
        </strong>
      );
    }
    if (segment.startsWith("*") && segment.endsWith("*") && segment.length > 2) {
      return <em key={i}>{segment.slice(1, -1)}</em>;
    }
    if (segment.startsWith("`") && segment.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-mono text-[13px] text-primary-hover"
        >
          {segment.slice(1, -1)}
        </code>
      );
    }
    return segment;
  });
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const hasToolParts = message.parts.some(
    (p) => p.type === "dynamic-tool" || p.type.startsWith("tool-")
  );

  return (
    <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`${
          isUser
            ? "max-w-[85%]"
            : hasToolParts
              ? "w-full max-w-full"
              : "max-w-[85%]"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text" && part.text.trim()) {
            return (
              <div
                key={i}
                className={`rounded-[var(--radius-card)] px-4 py-3 ${
                  isUser
                    ? "bg-primary text-white"
                    : "border border-border bg-surface text-text-primary"
                } ${i > 0 ? "mt-2" : ""}`}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {isUser ? part.text : renderInlineMarkdown(part.text)}
                </p>
              </div>
            );
          }

          if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
            const toolName =
              part.type === "dynamic-tool"
                ? (part as { toolName: string }).toolName
                : part.type.replace("tool-", "");

            const isToolLoading =
              "state" in part && part.state === "input-streaming";

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

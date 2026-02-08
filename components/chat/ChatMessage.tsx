"use client";

import { ReactNode } from "react";
import { UIMessage } from "ai";
import { ExerciseLogCard } from "@/components/generative-ui/ExerciseLogCard";
import { RecoveryLogCard } from "@/components/generative-ui/RecoveryLogCard";
import { WorkoutPlanCard } from "@/components/generative-ui/WorkoutPlanCard";
import { SessionSummaryCard } from "@/components/generative-ui/SessionSummaryCard";
import { GoalCard } from "@/components/generative-ui/GoalCard";
import { BackfillCard } from "@/components/generative-ui/BackfillCard";
import { ExerciseInfoCard } from "@/components/generative-ui/ExerciseInfoCard";
import { ProgressCard } from "@/components/generative-ui/ProgressCard";
import { DeleteExerciseCard } from "@/components/generative-ui/DeleteExerciseCard";
import { EditExerciseCard } from "@/components/generative-ui/EditExerciseCard";

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
    case "delete_exercise":
      return <DeleteExerciseCard data={data as never} isLoading={isLoading} />;
    case "edit_exercise":
      return <EditExerciseCard data={data as never} isLoading={isLoading} />;
    default:
      return null;
  }
}

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
      return <em key={i} className="text-text-secondary not-italic">{segment.slice(1, -1)}</em>;
    }
    if (segment.startsWith("`") && segment.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded-sm bg-surface-elevated px-1.5 py-0.5 font-mono text-[12px] text-primary-hover border border-border-subtle"
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

  return (
    <div className={`mb-6 flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col gap-1.5 ${isUser ? "items-end max-w-[85%]" : "items-start w-full"}`}>
        {/* Label */}
        <span className="text-[10px] uppercase tracking-widest text-text-tertiary font-mono">
          {isUser ? "You" : "Coach"}
        </span>

        {message.parts.map((part, i) => {
          if (part.type === "text" && part.text.trim()) {
            return (
              <div
                key={i}
                className={`py-1 ${isUser
                    ? "text-right text-[15px] text-text-primary"
                    : "text-left text-[15px] text-text-secondary leading-relaxed max-w-prose"
                  }`}
              >
                {isUser ? part.text : renderInlineMarkdown(part.text)}
              </div>
            );
          }

          if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
            const dynamicPart = part as any;
            const toolName = dynamicPart.toolName || part.type.replace("tool-", "");
            const isToolLoading = "state" in part && part.state === "input-streaming";
            const output = "output" in part ? part.output : undefined;
            const input = "input" in part ? part.input : undefined;

            const component = getToolComponent(
              toolName,
              output ?? input,
              isToolLoading
            );

            if (component) {
              return (
                <div key={i} className="w-full mt-2">
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

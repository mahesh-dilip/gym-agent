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
import { ProgressChartCard } from "@/components/generative-ui/ProgressChartCard";
import { AnalyticsCard } from "@/components/generative-ui/AnalyticsCard";
import { PRDashboardCard } from "@/components/generative-ui/PRDashboardCard";
import { DeleteExerciseCard } from "@/components/generative-ui/DeleteExerciseCard";
import { EditExerciseCard } from "@/components/generative-ui/EditExerciseCard";
import { DeleteSessionCard } from "@/components/generative-ui/DeleteSessionCard";

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
    case "show_progress": {
      const progressData = data as { view?: string };
      if (progressData.view === "chart") {
        return <ProgressChartCard data={data as never} isLoading={isLoading} />;
      }
      return <ProgressCard data={data as never} isLoading={isLoading} />;
    }
    case "show_analytics":
      return <AnalyticsCard data={data as never} isLoading={isLoading} />;
    case "show_prs":
      return <PRDashboardCard data={data as never} isLoading={isLoading} />;
    case "delete_exercise":
      return <DeleteExerciseCard data={data as never} isLoading={isLoading} />;
    case "edit_exercise":
      return <EditExerciseCard data={data as never} isLoading={isLoading} />;
    case "delete_session":
      return <DeleteSessionCard data={data as never} isLoading={isLoading} />;
    case "set_preference": {
      if (isLoading) return <div className="text-xs text-text-tertiary animate-pulse">Saving preference...</div>;
      const prefData = data as { status?: string; key?: string; value?: unknown };
      if (prefData.status === "saved") {
        return (
          <div className="inline-flex items-center gap-2 text-xs font-mono text-success bg-success-muted/10 border border-success/20 px-3 py-1.5 rounded">
            <span className="opacity-70">PREF_SAVED</span>
            <span className="font-bold">{prefData.key} = {String(prefData.value)}</span>
          </div>
        );
      }
      return null;
    }
    case "log_note": {
      if (isLoading) return <div className="text-xs text-text-tertiary animate-pulse">Saving note...</div>;
      const noteData = data as { status?: string; note?: string; category?: string };
      if (noteData.status === "saved") {
        return (
          <div className="inline-flex items-center gap-2 text-xs font-mono text-primary bg-primary/5 border border-primary/20 px-3 py-1.5 rounded">
            {noteData.category && (
              <span className="text-[10px] uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">{noteData.category}</span>
            )}
            <span>Noted: {noteData.note}</span>
          </div>
        );
      }
      return null;
    }
    default:
      return null;
  }
}

function renderInlineSegment(segment: string, key: number): ReactNode {
  if (segment.startsWith("**") && segment.endsWith("**")) {
    return (
      <strong key={key} className="font-semibold text-text-primary">
        {segment.slice(2, -2)}
      </strong>
    );
  }
  if (segment.startsWith("*") && segment.endsWith("*") && segment.length > 2) {
    return <em key={key} className="text-text-secondary not-italic">{segment.slice(1, -1)}</em>;
  }
  if (segment.startsWith("`") && segment.endsWith("`")) {
    return (
      <code
        key={key}
        className="rounded-sm bg-surface-elevated px-1.5 py-0.5 font-mono text-[12px] text-primary-hover border border-border-subtle"
      >
        {segment.slice(1, -1)}
      </code>
    );
  }
  return segment;
}

function renderInlineMarkdown(line: string): ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((seg, i) => renderInlineSegment(seg, i));
}

function renderMarkdownText(text: string): ReactNode[] {
  // Split into lines, process each
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Strip markdown headers — render as bold text
    if (/^#{1,4}\s+/.test(line)) {
      line = line.replace(/^#{1,4}\s+/, "");
      elements.push(
        <div key={key++} className="mt-2 first:mt-0">
          <strong className="font-semibold text-text-primary">{renderInlineMarkdown(line)}</strong>
        </div>
      );
      continue;
    }

    // Horizontal rules — thin separator
    if (/^-{3,}$/.test(line.trim())) {
      elements.push(<div key={key++} className="border-t border-border/50 my-2" />);
      continue;
    }

    // List items (- or *)
    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, "");
      elements.push(
        <div key={key++} className="flex gap-2 pl-1">
          <span className="text-text-tertiary shrink-0">·</span>
          <span>{renderInlineMarkdown(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered list items
    if (/^\s*\d+\.\s+/.test(line)) {
      const match = line.match(/^\s*(\d+)\.\s+(.*)/);
      if (match) {
        elements.push(
          <div key={key++} className="flex gap-2 pl-1">
            <span className="text-text-tertiary shrink-0 font-mono text-xs">{match[1]}.</span>
            <span>{renderInlineMarkdown(match[2])}</span>
          </div>
        );
        continue;
      }
    }

    // Empty lines → spacing
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Regular text
    elements.push(<div key={key++}>{renderInlineMarkdown(line)}</div>);
  }

  return elements;
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
                {isUser ? part.text : renderMarkdownText(part.text)}
              </div>
            );
          }

          if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
            const dynamicPart = part as any;
            const toolName = dynamicPart.toolName || part.type.replace("tool-", "");
            const isToolLoading = "state" in part && part.state === "input-streaming";
            const output =
              "output" in part ? (part as Record<string, unknown>).output : undefined;
            const input =
              "input" in part ? (part as Record<string, unknown>).input : undefined;

            // Server-executed tools need the output (execute result).
            // Client-confirmation tools need the input (AI's call args).
            const SERVER_TOOLS = new Set([
              "delete_exercise",
              "edit_exercise",
              "show_progress",
              "show_analytics",
              "show_prs",
              "backfill_workout",
              "delete_session",
              "set_preference",
              "log_note",
            ]);
            const data = SERVER_TOOLS.has(toolName)
              ? output ?? input
              : input;

            const component = getToolComponent(toolName, data, isToolLoading);

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

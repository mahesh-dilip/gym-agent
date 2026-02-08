import { streamText, type UIMessage, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildAgentContext, formatContextForPrompt } from "@/lib/agent/context-builder";
import { routeIntent } from "@/lib/agent/router";
import { getHaikuSystemPrompt, getSonnetSystemPrompt } from "@/lib/agent/prompts";
import { agentTools } from "@/lib/agent/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUserMessage?.parts
    ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ") || "";

  // Build context from DB
  const context = await buildAgentContext();
  const contextString = formatContextForPrompt(context);

  // Route to appropriate model
  const route = routeIntent(userText);
  const modelId =
    route === "sonnet"
      ? "claude-sonnet-4-5-20250929"
      : "claude-haiku-4-5-20251001";

  const systemPrompt =
    route === "sonnet"
      ? getSonnetSystemPrompt(contextString)
      : getHaikuSystemPrompt(contextString);

  // Convert UIMessages to ModelMessages for streamText
  const modelMessages = await convertToModelMessages(messages, {
    tools: agentTools,
  });

  const result = streamText({
    model: anthropic(modelId),
    system: systemPrompt,
    messages: modelMessages,
    tools: agentTools,
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}

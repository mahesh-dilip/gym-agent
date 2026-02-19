import {
  streamText,
  type UIMessage,
  stepCountIs,
  convertToModelMessages,
  createIdGenerator,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildAgentContext, formatContextForPrompt } from "@/lib/agent/context-builder";
import { buildCoachContext, formatCoachContext } from "@/lib/agent/coach-context-builder";
import { routeIntent } from "@/lib/agent/router";
import { getHaikuSystemPrompt, getSonnetSystemPrompt } from "@/lib/agent/prompts";
import { getCoachSystemPrompt } from "@/lib/agent/coach-prompts";
import { createAgentTools } from "@/lib/agent/tools";
import { createCoachTools } from "@/lib/agent/coach-tools";
import { createClient } from "@/lib/supabase/server";
import { saveChat, getChatId, getCoachChatId } from "@/lib/chat-store";

export const maxDuration = 30;

const generateMessageId = createIdGenerator({ prefix: "msg", size: 16 });

export async function POST(req: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages }: { messages: UIMessage[] } = await req.json();

    // Check for coach mode
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");
    const isCoach = mode === "coach";

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    const userText =
      lastUserMessage?.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ") || "";

    let systemPrompt: string;
    let tools;
    let modelId: string;
    let chatId: string;

    if (isCoach) {
      // Coach mode: always Sonnet, coach context, coach tools
      const coachContext = await buildCoachContext(user.id);
      const contextString = formatCoachContext(coachContext);
      systemPrompt = getCoachSystemPrompt(contextString);
      tools = createCoachTools(user.id);
      modelId = "claude-sonnet-4-5-20250929";
      chatId = getCoachChatId(user.id);
    } else {
      // Session mode: route to haiku/sonnet
      const context = await buildAgentContext();
      const contextString = formatContextForPrompt(context);
      tools = createAgentTools(user.id);
      const route = routeIntent(userText);
      modelId =
        route === "sonnet"
          ? "claude-sonnet-4-5-20250929"
          : "claude-haiku-4-5-20251001";
      systemPrompt =
        route === "sonnet"
          ? getSonnetSystemPrompt(contextString)
          : getHaikuSystemPrompt(contextString);
      chatId = getChatId(user.id);
    }

    // Convert UIMessages to ModelMessages — fallback if messages are malformed
    let modelMessages;
    try {
      modelMessages = await convertToModelMessages(messages, { tools });
    } catch (conversionError) {
      console.error("[chat] Message conversion failed:", conversionError);
      const fallbackMessages: UIMessage[] = messages
        .filter((m) => m.role === "user")
        .slice(-1);
      modelMessages = await convertToModelMessages(
        fallbackMessages.length > 0 ? fallbackMessages : messages.slice(-1),
        { tools }
      );
    }

    const result = streamText({
      model: anthropic(modelId),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(3),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId,
      onFinish: ({ messages: finalMessages }) => {
        saveChat({ chatId, userId: user.id, messages: finalMessages });
      },
    });
  } catch (error) {
    console.error("[chat] Route error:", error);
    return new Response(
      JSON.stringify({
        error: "Something went wrong. Please try again.",
        detail: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

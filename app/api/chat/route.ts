import { streamText, type UIMessage, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildAgentContext, formatContextForPrompt } from "@/lib/agent/context-builder";
import { routeIntent } from "@/lib/agent/router";
import { getHaikuSystemPrompt, getSonnetSystemPrompt } from "@/lib/agent/prompts";
import { createAgentTools } from "@/lib/agent/tools";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages }: { messages: UIMessage[] } = await req.json();

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const userText = lastUserMessage?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") || "";

    // Build context from DB
    const context = await buildAgentContext();
    const contextString = formatContextForPrompt(context);

    // Create tools with user context
    const tools = createAgentTools(user.id);

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

    // Convert UIMessages to ModelMessages — this can throw if messages are malformed
    let modelMessages;
    try {
      modelMessages = await convertToModelMessages(messages, { tools });
    } catch (conversionError) {
      console.error("[chat] Message conversion failed:", conversionError);
      // Fall back to only the last user message to recover the conversation
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

    return result.toUIMessageStreamResponse();
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

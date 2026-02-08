import type { UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

/** Chat ID = "{userId}-{YYYY-MM-DD}" — one chat per user per day */
export function getChatId(userId: string, date?: Date): string {
  return `${userId}-${format(date ?? new Date(), "yyyy-MM-dd")}`;
}

/** Save (upsert) chat messages to Supabase. Called from onFinish in the route handler. */
export async function saveChat({
  chatId,
  userId,
  messages,
}: {
  chatId: string;
  userId: string;
  messages: UIMessage[];
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("chats").upsert({
      id: chatId,
      user_id: userId,
      messages: JSON.parse(JSON.stringify(messages)),
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("[chat-store] Save failed:", error.message);
  } catch (err) {
    console.error("[chat-store] Save error:", err);
  }
}

/** Load today's chat messages for the authenticated user. */
export async function loadChat(chatId: string): Promise<UIMessage[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("chats")
      .select("messages")
      .eq("id", chatId)
      .single();

    if (error || !data) return [];
    return data.messages as UIMessage[];
  } catch {
    return [];
  }
}

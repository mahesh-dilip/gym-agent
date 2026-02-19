import type { UIMessage } from "ai";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

const supabase = createClient();

/** Save chat messages from the client side. Fire-and-forget. */
export async function saveChatClient(messages: UIMessage[]): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const chatId = `${user.id}-${format(new Date(), "yyyy-MM-dd")}`;

    await supabase.from("chats").upsert({
      id: chatId,
      user_id: user.id,
      messages: JSON.parse(JSON.stringify(messages)),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[chat-store-client] Save error:", err);
  }
}

/** Save chat messages with a specific chat ID. Used by coach mode. */
export async function saveChatClientWithId(
  chatId: string,
  messages: UIMessage[]
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("chats").upsert({
      id: chatId,
      user_id: user.id,
      messages: JSON.parse(JSON.stringify(messages)),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[chat-store-client] Save error:", err);
  }
}

/** Load chat messages by ID from client side. */
export async function loadChatClient(chatId: string): Promise<UIMessage[]> {
  try {
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

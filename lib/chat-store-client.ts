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

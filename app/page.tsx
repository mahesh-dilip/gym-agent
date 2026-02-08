import { SharedStateProvider } from "@/lib/state/shared-state";
import { SessionHeader } from "@/components/session/SessionHeader";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { loadChat, getChatId } from "@/lib/chat-store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Load today's chat from Supabase (server-side)
  let initialMessages: Awaited<ReturnType<typeof loadChat>> = [];
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const chatId = getChatId(user.id);
      initialMessages = await loadChat(chatId);
    }
  } catch {
    // Fall through with empty messages
  }

  return (
    <SharedStateProvider>
      <div className="flex h-dvh flex-col bg-background">
        <SessionHeader />
        <div className="flex-1 overflow-hidden">
          <ChatContainer initialMessages={initialMessages} />
        </div>
      </div>
    </SharedStateProvider>
  );
}

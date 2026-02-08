import { SharedStateProvider } from "@/lib/state/shared-state";
import { SessionHeader } from "@/components/session/SessionHeader";
import { ChatContainer } from "@/components/chat/ChatContainer";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <SharedStateProvider>
      <div className="flex h-dvh flex-col bg-background">
        {/* Top: Session status */}
        <SessionHeader />

        {/* Middle + Bottom: Chat takes remaining space */}
        <div className="flex-1 overflow-hidden">
          <ChatContainer />
        </div>
      </div>
    </SharedStateProvider>
  );
}

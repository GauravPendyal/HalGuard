"use client";

import { ChatProvider } from "@/context/ChatContext";
import { HalluciGuardShell } from "@/components/shell/HalluciGuardShell";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function ChatPage() {
  return (
    <ChatProvider>
      <TooltipProvider delayDuration={200}>
        <HalluciGuardShell />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              fontFamily: "inherit"
            }
          }}
        />
      </TooltipProvider>
    </ChatProvider>
  );
}

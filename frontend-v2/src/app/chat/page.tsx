"use client";

import dynamic from "next/dynamic";
import "@/components/chat/chat.css";

const ChatApp = dynamic(
  () => import("@/components/chat/ChatApp").then((mod) => mod.ChatApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-[#212121] text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading Chat Workspace...</span>
        </div>
      </div>
    ),
  }
);

export default function ChatPage() {
  return <ChatApp />;
}

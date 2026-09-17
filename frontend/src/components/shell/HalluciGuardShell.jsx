"use client";

import { useChat } from "@/context/ChatContext";
import { HalluciGuardSidebar } from "./HalluciGuardSidebar";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { SearchModal } from "@/components/modals/SearchModal";
import { ShortcutsModal } from "@/components/modals/ShortcutsModal";
import { SourceDrawer } from "@/components/chat/SourceDrawer";
import ChatPage from "@/views/ChatPage";
import HistoryPage from "@/views/HistoryPage";
import EvidencePage from "@/views/EvidencePage";
import LibraryPage from "@/views/LibraryPage";

export function HalluciGuardShell() {
  const { collapsed, activePath } = useChat();

  const renderContent = () => {
    if (activePath === "/history") return <HistoryPage />;
    if (activePath === "/evidence") return <EvidencePage />;
    if (activePath === "/library" || activePath.startsWith("/projects/")) return <LibraryPage />;
    return <ChatPage />;
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-hg-bg text-hg-text" data-testid="halluciguard-shell">
      <div className="pointer-events-none absolute inset-0 hg-atmosphere" aria-hidden="true" />
      <HalluciGuardSidebar />
      <main
        className="relative flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-out"
        style={{ marginLeft: 0 }}
        data-collapsed={collapsed}
      >
        {renderContent()}
      </main>
      <SettingsModal />
      <SearchModal />
      <ShortcutsModal />
      <SourceDrawer />
    </div>
  );
}

'use client';

import * as React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Tabs } from '@/components/ui/Tabs';
import { StudioCenterPanel, MiniAgentGraph } from '@/components/studio';
import { ChatConsole, VerificationCard } from '@/features/conversation';
import { TerminalLogs } from '@/components/workflow/TerminalLogs';
import { VerificationTimeline } from '@/components/workflow/VerificationTimeline';
import { ReplayButton } from '@/components/workflow/ReplayButton';
import { AgentInspector } from '@/features/workflow/components/AgentInspector';
import { DeveloperModeModal } from '@/features/command/components/DeveloperModeModal';
import { useChatStore } from '@/store/chatStore';
import { RightPanelTab } from '@/types';
import {
  Workflow,
  Clock,
  Terminal,
  FileCheck2,
  BarChart2,
  Brain,
  RotateCcw,
} from 'lucide-react';

export function MainLayout({ children }: { children?: React.ReactNode }) {
  const { activeTab, setActiveTab } = useChatStore();

  const rightPanelTabs: { id: RightPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'workflow', label: 'Workflow', icon: <Workflow className="w-3.5 h-3.5" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'logs', label: 'Logs', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'evidence', label: 'Evidence', icon: <FileCheck2 className="w-3.5 h-3.5" /> },
    { id: 'metrics', label: 'Metrics', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'memory', label: 'Memory', icon: <Brain className="w-3.5 h-3.5" /> },
    { id: 'replay', label: 'Replay', icon: <RotateCcw className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased selection:bg-blue-600/30 selection:text-white">
      {/* Global Modals & Side Drawers */}
      <DeveloperModeModal />
      <AgentInspector />

      {/* LEFT COLUMN: Sidebar Shell */}
      <Sidebar />

      {/* CENTER & RIGHT COLUMNS CONTAINER */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Top Navigation Bar */}
        <TopBar />

        {/* 2-Column Split Stage (Center Verification Studio + Right Intelligence Panel) */}
        <div className="flex flex-1 overflow-hidden">
          {/* CENTER STAGE: Verification Studio Experience & Command Console */}
          <main className="flex-1 flex flex-col h-full overflow-hidden border-r border-zinc-800/80 bg-zinc-950/50">
            {children ? (
              children
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-y-auto">
                <StudioCenterPanel />
                <VerificationCard />
                <div className="sticky bottom-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800/60">
                  <ChatConsole />
                </div>
              </div>
            )}
          </main>

          {/* RIGHT PANEL: Intelligence Suite Tabs & Workflow Engine */}
          <aside className="w-96 flex flex-col h-full bg-zinc-950/90 border-l border-zinc-800/80 backdrop-blur-xl">
            {/* Header Tabs */}
            <div className="pt-2">
              <Tabs
                tabs={rightPanelTabs}
                activeTab={activeTab}
                onChange={(tabId) => setActiveTab(tabId as RightPanelTab)}
                variant="underline"
              />
            </div>

            {/* Tab View Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'workflow' && <MiniAgentGraph />}
              {activeTab === 'timeline' && <VerificationTimeline />}
              {activeTab === 'logs' && <TerminalLogs />}
              {activeTab === 'replay' && (
                <div className="p-4">
                  <ReplayButton />
                </div>
              )}
              {activeTab !== 'workflow' &&
                activeTab !== 'timeline' &&
                activeTab !== 'logs' &&
                activeTab !== 'replay' && (
                  <div className="flex flex-col items-center justify-center p-8 text-center select-none h-full">
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3">
                      {rightPanelTabs.find((t) => t.id === activeTab)?.icon}
                    </div>
                    <h3 className="text-xs font-semibold text-zinc-200 capitalize">
                      {activeTab} Panel (Online)
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                      Telemetry synchronized with real-time verification event engine.
                    </p>
                  </div>
                )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

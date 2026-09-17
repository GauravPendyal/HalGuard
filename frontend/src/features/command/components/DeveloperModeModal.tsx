'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { useChatStore, DeveloperTab } from '@/store/chatStore';
import { EventInspector } from './EventInspector';
import { EventBusMonitor } from './EventBusMonitor';
import { AppStateInspector } from './AppStateInspector';
import { MockEngineDashboard } from './MockEngineDashboard';
import { PerformancePanel } from './PerformancePanel';
import { WorkflowSimulator } from './WorkflowSimulator';
import { Terminal, Activity, Database, Cpu, Gauge, Sliders } from 'lucide-react';

export function DeveloperModeModal() {
  const { isDeveloperMode, setDeveloperMode, developerTab, setDeveloperTab } = useChatStore();

  // Listen to ⌘Key/CtrlKey + Shift + D keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDeveloperMode(!isDeveloperMode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeveloperMode, setDeveloperMode]);

  const tabs: { id: DeveloperTab | 'simulator'; label: string; icon: React.ReactNode }[] = [
    { id: 'events', label: 'Event Inspector', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'bus', label: 'Event Bus Monitor', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'state', label: 'State Inspector', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'engine', label: 'Mock Engine', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'performance', label: 'Performance', icon: <Gauge className="w-3.5 h-3.5" /> },
    { id: 'simulator', label: 'Simulator', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <Modal
      isOpen={isDeveloperMode}
      onClose={() => setDeveloperMode(false)}
      title="Developer & Diagnostics Control Center (⌘⇧D)"
    >
      <div className="flex flex-col h-[520px] w-full max-w-4xl">
        <div className="mb-3">
          <Tabs
            tabs={tabs}
            activeTab={developerTab}
            onChange={(id) => setDeveloperTab(id as DeveloperTab)}
            variant="underline"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          {developerTab === 'events' && <EventInspector />}
          {developerTab === 'bus' && <EventBusMonitor />}
          {developerTab === 'state' && <AppStateInspector />}
          {developerTab === 'engine' && <MockEngineDashboard />}
          {developerTab === 'performance' && <PerformancePanel />}
          {(developerTab as string) === 'simulator' && <WorkflowSimulator />}
        </div>
      </div>
    </Modal>
  );
}

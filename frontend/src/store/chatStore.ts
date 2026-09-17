import { create } from 'zustand';
import {
  AgentId,
  ChatSession,
  ModelOption,
  RightPanelTab,
  SystemSettings,
  VerificationMode,
} from '@/types';

export type DeveloperTab = 'events' | 'bus' | 'state' | 'engine' | 'performance';

interface UIState {
  // Theme & Layout
  theme: 'dark';
  isSidebarCollapsed: boolean;
  activeTab: RightPanelTab;
  
  // Controls
  verificationMode: VerificationMode;
  selectedModel: ModelOption;
  
  // Modals & Developer Mode
  isAnalyticsOpen: boolean;
  isSettingsOpen: boolean;
  isReportOpen: boolean;
  isDeveloperMode: boolean;
  developerTab: DeveloperTab;
  selectedAgentId: AgentId | null;
  
  // Workspace Data & Placeholders
  activeSessionId: string | null;
  sessions: ChatSession[];
  selectedNodeId: AgentId | null;
  settings: SystemSettings;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: RightPanelTab) => void;
  setVerificationMode: (mode: VerificationMode) => void;
  setSelectedModel: (model: ModelOption) => void;
  setSelectedNode: (nodeId: AgentId | null) => void;
  
  // Modal & Developer Toggles
  setAnalyticsOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setReportOpen: (open: boolean) => void;
  toggleDeveloperMode: () => void;
  setDeveloperMode: (open: boolean) => void;
  setDeveloperTab: (tab: DeveloperTab) => void;
  setSelectedAgentId: (agentId: AgentId | null) => void;
  
  // Future Placeholders
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  createNewSession: () => void;
}

const DEFAULT_SETTINGS: SystemSettings = {
  strictnessThreshold: 85,
  enableAutoCorrect: true,
  enableMemoryCache: true,
  maxParallelSources: 10,
};

export const useChatStore = create<UIState>((set) => ({
  theme: 'dark',
  isSidebarCollapsed: false,
  activeTab: 'workflow',
  
  verificationMode: 'standard',
  selectedModel: 'HalluciGuard-v2-Deep',
  
  isAnalyticsOpen: false,
  isSettingsOpen: false,
  isReportOpen: false,
  isDeveloperMode: false,
  developerTab: 'events',
  selectedAgentId: null,
  
  activeSessionId: 'session-default',
  sessions: [],
  selectedNodeId: null,
  settings: DEFAULT_SETTINGS,

  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setVerificationMode: (mode) => set({ verificationMode: mode }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  
  setAnalyticsOpen: (open) => set({ isAnalyticsOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setReportOpen: (open) => set({ isReportOpen: open }),
  toggleDeveloperMode: () => set((state) => ({ isDeveloperMode: !state.isDeveloperMode })),
  setDeveloperMode: (open) => set({ isDeveloperMode: open }),
  setDeveloperTab: (tab) => set({ developerTab: tab }),
  setSelectedAgentId: (agentId) => set({ selectedAgentId: agentId }),

  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),

  createNewSession: () =>
    set({
      activeSessionId: `session-${Date.now()}`,
      selectedNodeId: null,
    }),
}));

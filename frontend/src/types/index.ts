export type AgentId = 'llm' | 'detector' | 'verifier' | 'memory' | 'judge' | 'corrector';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';
export type VerificationMode = 'strict' | 'standard' | 'fast';
export type ModelOption = 'HalluciGuard-v2-Deep' | 'GPT-4o-Guard' | 'Claude-3.5-Verify';
export type RightPanelTab = 'workflow' | 'timeline' | 'logs' | 'evidence' | 'metrics' | 'memory' | 'replay';
export type PromptCategory = 'Research' | 'Medical' | 'Finance' | 'Legal' | 'Coding' | 'News';

export interface AgentNodeState {
  id: AgentId;
  name: string;
  description: string;
  status: AgentStatus;
  progress: number;
  executionTimeMs: number;
  logs: LogEntry[];
  metrics: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  agentId: AgentId;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface VerificationClaim {
  id: string;
  claimText: string;
  status: 'verified' | 'corrected' | 'rejected';
  confidence: number;
  evidenceUrl?: string;
  evidenceSnippet?: string;
  originalText?: string;
  correctedText?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  rawResponse?: string;
  verifiedResponse?: string;
  claims: VerificationClaim[];
  isVerifying: boolean;
  activeAgentId?: AgentId;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  mode: VerificationMode;
  messages: ChatMessage[];
  overallConfidence: number;
  category?: PromptCategory;
}

export interface SystemSettings {
  strictnessThreshold: number;
  enableAutoCorrect: boolean;
  enableMemoryCache: boolean;
  maxParallelSources: number;
  apiKey?: string;
}

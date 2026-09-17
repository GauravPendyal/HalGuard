import { AgentId, AgentStatus, LogEntry } from '@/types';

export interface AgentEventPayload {
  agentId: AgentId;
  status: AgentStatus;
  progress: number;
  log?: LogEntry;
}

export interface IWebSocketService {
  connect(url: string): void;
  disconnect(): void;
  onAgentEvent(callback: (payload: AgentEventPayload) => void): void;
}

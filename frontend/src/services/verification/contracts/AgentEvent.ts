export interface BackendAgentEventContract {
  eventId: string;
  eventType: string;
  timestamp: string;
  agentId: string;
  progress: number;
  payload: Record<string, unknown>;
}

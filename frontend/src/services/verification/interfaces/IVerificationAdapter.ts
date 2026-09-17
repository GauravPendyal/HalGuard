import { VerificationMode } from '@/types';

export interface AdapterCapabilities {
  supportsReplay: boolean;
  supportsStreaming: boolean;
  supportsMemory: boolean;
  supportsReports: boolean;
  supportsMultiAgent: boolean;
  supportsExplainability: boolean;
  supportsCitations: boolean;
  supportsImages: boolean;
}

export interface AdapterHealthStatus {
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  activeTransport: string;
  engineVersion: string;
}

export interface IVerificationAdapter {
  id: string;
  name: string;
  verify(prompt: string, mode: VerificationMode, model: string): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  replay(sessionId: string): Promise<void>;
  health(): Promise<AdapterHealthStatus>;
  getCapabilities(): AdapterCapabilities;
}

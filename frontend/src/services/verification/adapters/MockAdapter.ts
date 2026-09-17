import { IVerificationAdapter, AdapterCapabilities, AdapterHealthStatus } from '../interfaces/IVerificationAdapter';
import { runMockVerification, replayEvents } from '@/engine';
import { VerificationMode } from '@/types';

export class MockAdapter implements IVerificationAdapter {
  id = 'mock-adapter';
  name = 'HalluciGuard Mock Engine Adapter';

  async verify(prompt: string, mode: VerificationMode, model: string): Promise<void> {
    await runMockVerification(prompt, mode, model);
  }

  async cancel(): Promise<void> {}

  async replay(): Promise<void> {
    await replayEvents();
  }

  async health(): Promise<AdapterHealthStatus> {
    return {
      status: 'ONLINE',
      latencyMs: 12,
      activeTransport: 'EventBusTransport',
      engineVersion: '2.0.0-mock',
    };
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsReplay: true,
      supportsStreaming: true,
      supportsMemory: true,
      supportsReports: true,
      supportsMultiAgent: true,
      supportsExplainability: true,
      supportsCitations: true,
      supportsImages: false,
    };
  }
}

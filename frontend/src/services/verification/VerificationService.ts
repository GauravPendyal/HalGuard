import { IVerificationAdapter } from './interfaces/IVerificationAdapter';
import { HalluciGuardAdapter } from './adapters/HalluciGuardAdapter';
import { VerificationMode } from '@/types';

class VerificationService {
  private activeAdapter: IVerificationAdapter = new HalluciGuardAdapter();

  setAdapter(adapter: IVerificationAdapter) {
    this.activeAdapter = adapter;
  }

  getActiveAdapter(): IVerificationAdapter {
    return this.activeAdapter;
  }

  async verifyPrompt(prompt: string, mode: VerificationMode, model: string): Promise<void> {
    await this.activeAdapter.verify(prompt, mode, model);
  }

  async replaySession(sessionId: string): Promise<void> {
    await this.activeAdapter.replay(sessionId);
  }

  async cancelVerification(sessionId: string): Promise<void> {
    await this.activeAdapter.cancel(sessionId);
  }

  async checkHealth() {
    return await this.activeAdapter.health();
  }

  getCapabilities() {
    return this.activeAdapter.getCapabilities();
  }
}

export const verificationService = new VerificationService();

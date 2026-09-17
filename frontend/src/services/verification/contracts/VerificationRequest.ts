import { VerificationMode } from '@/types';

export interface VerificationRequestContract {
  prompt: string;
  mode: VerificationMode;
  model: string;
  sessionId?: string;
  options?: {
    strictnessThreshold?: number;
    enableAutoCorrect?: boolean;
    maxParallelSources?: number;
  };
}

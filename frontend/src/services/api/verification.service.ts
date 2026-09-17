import { VerificationClaim, VerificationMode } from '@/types';

export interface VerifyPromptRequest {
  prompt: string;
  mode: VerificationMode;
  model: string;
}

export interface VerifyPromptResponse {
  sessionId: string;
  claims: VerificationClaim[];
  overallConfidence: number;
  executionTimeMs: number;
}

export interface IVerificationService {
  verifyPrompt(request: VerifyPromptRequest): Promise<VerifyPromptResponse>;
  exportReport(sessionId: string, format: 'json' | 'pdf'): Promise<Blob>;
}

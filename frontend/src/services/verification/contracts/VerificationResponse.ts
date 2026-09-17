export interface VerificationResponseContract {
  sessionId: string;
  rawCandidateResponse: string;
  verifiedResponse: string;
  overallConfidence: number;
  totalExecutionTimeMs: number;
  certificateId: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
}

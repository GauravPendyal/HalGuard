import { AgentId, VerificationClaim, VerificationMode } from '@/types';

export type VerificationEventType =
  | 'PROMPT_SUBMITTED'
  | 'LLM_DRAFT_STARTED'
  | 'LLM_DRAFT_STREAM'
  | 'LLM_DRAFT_COMPLETED'
  | 'CLAIMS_EXTRACTED'
  | 'EVIDENCE_DISCOVERED'
  | 'CONSENSUS_UPDATED'
  | 'CORRECTION_STARTED'
  | 'CORRECTION_COMPLETED'
  | 'MEMORY_UPDATED'
  | 'VERIFICATION_COMPLETED'
  | 'REPORT_GENERATED';

export interface BaseEventPayload {
  sessionId: string;
  timestamp: string;
}

export interface PromptSubmittedPayload extends BaseEventPayload {
  prompt: string;
  mode: VerificationMode;
  model: string;
}

export interface AgentProgressPayload extends BaseEventPayload {
  agentId: AgentId;
  progress: number;
  message?: string;
}

export interface StreamTextPayload extends BaseEventPayload {
  chunk: string;
  accumulatedText: string;
}

export interface ClaimsExtractedPayload extends BaseEventPayload {
  claims: VerificationClaim[];
}

export interface EvidenceDiscoveredPayload extends BaseEventPayload {
  evidence: {
    source: string;
    trustScore: number;
    relevance: number;
    snippet: string;
    latencyMs: number;
    url: string;
  }[];
}

export interface ConsensusUpdatedPayload extends BaseEventPayload {
  confidence: number; // 0 - 100
}

export interface CorrectionPayload extends BaseEventPayload {
  originalText: string;
  correctedText: string;
  diffs: { type: 'add' | 'delete' | 'equal'; value: string }[];
}

export interface VerificationCompletedPayload extends BaseEventPayload {
  finalResponse: string;
  overallConfidence: number;
  totalExecutionTimeMs: number;
  certificateId: string;
}

export type EventPayloadMap = {
  PROMPT_SUBMITTED: PromptSubmittedPayload;
  LLM_DRAFT_STARTED: AgentProgressPayload;
  LLM_DRAFT_STREAM: StreamTextPayload;
  LLM_DRAFT_COMPLETED: AgentProgressPayload;
  CLAIMS_EXTRACTED: ClaimsExtractedPayload;
  EVIDENCE_DISCOVERED: EvidenceDiscoveredPayload;
  CONSENSUS_UPDATED: ConsensusUpdatedPayload;
  CORRECTION_STARTED: AgentProgressPayload;
  CORRECTION_COMPLETED: CorrectionPayload;
  MEMORY_UPDATED: AgentProgressPayload;
  VERIFICATION_COMPLETED: VerificationCompletedPayload;
  REPORT_GENERATED: BaseEventPayload;
};

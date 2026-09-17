import { eventBus, VerificationEventType } from '@/engine';

export class EventMapper {
  static mapAndEmit(backendEventType: string, rawPayload: Record<string, unknown>): void {
    const eventMapping: Record<string, VerificationEventType> = {
      prompt_submitted: 'PROMPT_SUBMITTED',
      llm_draft_started: 'LLM_DRAFT_STARTED',
      llm_draft_stream: 'LLM_DRAFT_STREAM',
      llm_draft_completed: 'LLM_DRAFT_COMPLETED',
      claims_extracted: 'CLAIMS_EXTRACTED',
      evidence_discovered: 'EVIDENCE_DISCOVERED',
      consensus_updated: 'CONSENSUS_UPDATED',
      correction_started: 'CORRECTION_STARTED',
      correction_completed: 'CORRECTION_COMPLETED',
      memory_updated: 'MEMORY_UPDATED',
      verification_completed: 'VERIFICATION_COMPLETED',
      report_generated: 'REPORT_GENERATED',
    };

    const frontendType = eventMapping[backendEventType.toLowerCase()];
    if (frontendType) {
      eventBus.emit(frontendType, rawPayload as never);
    }
  }
}

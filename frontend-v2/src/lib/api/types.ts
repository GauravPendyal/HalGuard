/**
 * API types for HalluciGuard.
 *
 * Two layers, kept deliberately separate:
 *   1. Raw* types  — mirror the FROZEN FastAPI `/verify` contract exactly, with
 *      every field optional/nullable. The backend may legitimately omit fields
 *      (e.g. verifier skipped on the detector fast-path), so we never assume.
 *   2. View-model types — the clean, normalized shapes the UI renders. The
 *      mapper (map.ts) is the ONLY place that turns Raw* into view models, and
 *      it never fabricates a value: missing data stays missing (null).
 *
 * Contract source of truth: orchestration/api.py + agents/verifier_agent/schemas/models.py
 */

/* ============================================================================
   Shared enums / unions
   ========================================================================== */

export type Verdict = "verified" | "contradicted" | "unverified" | "conflicted";
export type EntailmentLabel = "entailment" | "contradiction" | "neutral";
export type EvidenceRelation = "supporting" | "contradicting" | "neutral" | "irrelevant";
export type StageStatus = "completed" | "running" | "failed" | "skipped";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type GenerationMode = "normal" | "stress_test";

/** Canonical pipeline stage ids, in execution order. */
export const PIPELINE_STAGE_ORDER = [
  "domain_validation",
  "claim_decomposition",
  "query_expansion",
  "retrieval",
  "aggregation",
  "reranking",
  "nli",
  "scoring",
  "formatting",
] as const;
export type PipelineStageId = (typeof PIPELINE_STAGE_ORDER)[number];

/* ============================================================================
   Request
   ========================================================================== */

export interface ConversationTurn {
  role: string;
  content: string;
}

export interface VerificationRequest {
  user_query: string;
  generation_mode?: GenerationMode;
  llm_response?: string | null;
  conversation_history?: ConversationTurn[];
  domain?: string;
  request_id?: string | null;
}

/* ============================================================================
   Raw response — mirrors the backend dict. Everything optional by design.
   ========================================================================== */

export interface RawEvidenceItem {
  title?: string | null;
  source?: string | null;
  url?: string | null;
  publication_date?: string | null;
  snippet?: string | null;
  entailment_label?: string | null;
  entailment_score?: number | null;
  credibility_score?: number | null;
  source_confidence_hint?: number | null;
  adapter_score?: number | null;
  bge_score?: number | null;
  nli_entailment?: number | null;
  nli_contradiction?: number | null;
  nli_neutral?: number | null;
  classification?: string | null;
  // Fields seen in real diagnostic payloads:
  relevance_score?: number | null;
  nli_label?: string | null;
  credibility?: number | null;
  in_decision_grade?: boolean | null;
}

export interface RawClaimReport {
  claim_id?: string | null;
  claim_text?: string | null;
  evidence?: RawEvidenceItem[] | null;
  support_score?: number | null;
  contradiction_score?: number | null;
  trust_score?: number | null;
  confidence_score?: number | null;
  verdict?: string | null;
  explanation?: string | null;
  supporting_sources?: unknown[] | null;
  contradicting_sources?: unknown[] | null;
  retrieved_documents?: number | null;
  reranked_documents?: number | null;
  verified_evidence?: number | null;
  retrieval_trace?: Record<string, unknown> | null;
}

export interface RawPipelineStage {
  stage?: string | null;
  status?: string | null;
  duration_ms?: number | null;
  details?: string | null;
}

export interface RawRuntimeModels {
  embedding_model?: string | null;
  reranker_model?: string | null;
  nli_model?: string | null;
  cross_encoder?: string | null;
  classification_model?: string | null;
  retrieval_strategy?: string | null;
  device?: string | null;
  claim_complexity?: string | null;
  latency_budget?: string | number | null;
  routing_reason?: string | null;
}

export interface RawVerifier {
  query_id?: string | null;
  domain?: string | null;
  domain_validated?: boolean | null;
  adapter?: string | null;
  sources_attempted?: string[] | null;
  sources_succeeded?: string[] | null;
  sources_failed?: string[] | null;
  retrieved_sources?: number | null;
  verified_sources?: number | null;
  claim_evidence?: RawClaimReport[] | null;
  overall_evidence_confidence?: number | null;
  latency_ms?: number | null;
  pipeline_stages?: RawPipelineStage[] | null;
  runtime_models?: RawRuntimeModels | null;
  cache_hit?: boolean | null;
}

export interface RawDetector {
  hallucination_probability?: number | null;
  confidence_score?: number | null;
  risk_level?: string | null;
  next_action?: string | null;
  model_source?: string | null;
  status?: string | null;
}

export interface RawTraceEvent {
  execution_id?: string | null;
  node?: string | null;
  status?: string | null;
  timestamp?: string | number | null;
  latency_ms?: number | null;
  retry_count?: number | null;
  details?: string | null;
}

export interface RawVerificationResponse {
  execution_id?: string | null;
  request_id?: string | null;
  generation?: string | null;
  base_llm?: string | null;
  draft_response?: string | null;
  final_response?: string | null;
  terminal_status?: string | null;
  verification_status?: string | null;
  total_latency_ms?: number | null;
  detector?: RawDetector | null;
  verifier?: RawVerifier | null;
  memory?: Record<string, unknown> | null;
  active_agents?: string[] | null;
  disabled_agents?: string[] | null;
  judge?: { enabled?: boolean } | null;
  corrector?: { enabled?: boolean } | null;
  retry_count?: number | null;
  errors?: unknown[] | null;
  inter_agent_bus?: unknown[] | null;
  trace?: RawTraceEvent[] | null;
  audit?: Record<string, unknown> | null;
}

/* ============================================================================
   View models — what components consume.
   ========================================================================== */

export interface EvidenceVM {
  id: string;
  title: string | null;
  source: string | null;
  url: string | null;
  publicationDate: string | null;
  snippet: string | null;
  relation: EvidenceRelation | null;
  entailmentLabel: EntailmentLabel | null;
  /** Distribution across NLI classes; any may be null. */
  nli: { entailment: number | null; contradiction: number | null; neutral: number | null };
  /** Reranker relevance (BGE). */
  bgeScore: number | null;
  /** Source credibility 0..1. */
  credibility: number | null;
  /** Whether this evidence made it into the decision-grade set. */
  inDecisionGrade: boolean | null;
}

export interface ClaimVM {
  id: string;
  text: string | null;
  verdict: Verdict | null;
  explanation: string | null;
  scores: {
    support: number | null;
    contradiction: number | null;
    trust: number | null;
    confidence: number | null;
  };
  counts: {
    retrieved: number | null;
    reranked: number | null;
    verified: number | null;
    supporting: number;
    contradicting: number;
  };
  evidence: EvidenceVM[];
}

export interface PipelineStageVM {
  id: PipelineStageId | string;
  label: string;
  /** Which agent/system owns this stage — drives the honest n8n vs Python split. */
  owner: "n8n" | "python";
  status: StageStatus;
  durationMs: number | null;
  details: string | null;
}

export interface RuntimeModelsVM {
  embeddingModel: string | null;
  rerankerModel: string | null;
  nliModel: string | null;
  crossEncoder: string | null;
  classificationModel: string | null;
  retrievalStrategy: string | null;
  device: string | null;
  claimComplexity: string | null;
  latencyBudget: string | null;
  routingReason: string | null;
}

export interface DetectorVM {
  hallucinationProbability: number | null;
  confidence: number | null;
  riskLevel: RiskLevel | null;
  nextAction: string | null;
  modelSource: string | null;
  status: string | null;
}

export interface TraceEventVM {
  node: string;
  status: string;
  latencyMs: number | null;
  retryCount: number | null;
  details: string | null;
  timestamp: string | null;
}

export interface RetrievalSummaryVM {
  adapter: string | null;
  domain: string | null;
  domainValidated: boolean | null;
  attempted: string[];
  succeeded: string[];
  failed: string[];
  retrievedSources: number | null;
  verifiedSources: number | null;
  cacheHit: boolean | null;
}

export interface VerificationResult {
  executionId: string | null;
  requestId: string | null;

  /** The answer, kept strictly separate from the verification. */
  answer: {
    model: string | null;
    draft: string | null;
    final: string | null;
  };

  /** Overall, backend-provided status — not derived by us. */
  verificationStatus: string | null;
  terminalStatus: string | null;
  overallVerdict: Verdict | null;
  overallConfidence: number | null;

  detector: DetectorVM | null;
  /** True when the detector fast-path accepted and the verifier never ran. */
  verifierSkipped: boolean;

  retrieval: RetrievalSummaryVM | null;
  runtimeModels: RuntimeModelsVM | null;

  claims: ClaimVM[];
  stages: PipelineStageVM[];
  trace: TraceEventVM[];

  totalLatencyMs: number | null;
  activeAgents: string[];
  disabledAgents: string[];
  errors: string[];

  /** Raw payload retained for the "advanced / raw" transparency drawer. */
  raw: RawVerificationResponse;
}

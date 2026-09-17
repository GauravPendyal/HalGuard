/**
 * map.ts — the ONLY place raw backend payloads become view models.
 *
 * Guiding rule: never fabricate. If the backend omits a value we surface it as
 * null (the UI renders "—"); we never invent scores, timestamps, evidence, or
 * statuses. Where we *interpret* a value (e.g. deriving an evidence relation
 * from the model's own NLI label when an explicit classification is absent) it
 * is a transparent mapping of data the backend already produced, never a guess
 * about data it didn't.
 */

import {
  PIPELINE_STAGE_ORDER,
  type ClaimVM,
  type DetectorVM,
  type EntailmentLabel,
  type EvidenceRelation,
  type EvidenceVM,
  type PipelineStageId,
  type PipelineStageVM,
  type RawClaimReport,
  type RawEvidenceItem,
  type RawPipelineStage,
  type RawVerificationResponse,
  type RetrievalSummaryVM,
  type RiskLevel,
  type RuntimeModelsVM,
  type StageStatus,
  type TraceEventVM,
  type Verdict,
  type VerificationResult,
} from "@/lib/api/types";

/* -------------------------------- helpers -------------------------------- */

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function normalizeVerdict(v: unknown): Verdict | null {
  const s = str(v)?.toLowerCase();
  if (s === "verified" || s === "contradicted" || s === "unverified" || s === "conflicted") {
    return s;
  }
  return null;
}

function normalizeEntailment(v: unknown): EntailmentLabel | null {
  const s = str(v)?.toLowerCase();
  if (s === "entailment" || s === "contradiction" || s === "neutral") return s;
  // Some payloads use short forms.
  if (s === "entail") return "entailment";
  if (s === "contradict") return "contradiction";
  return null;
}

function normalizeRelation(v: unknown): EvidenceRelation | null {
  const s = str(v)?.toLowerCase();
  if (s === "supporting" || s === "contradicting" || s === "neutral" || s === "irrelevant") {
    return s;
  }
  return null;
}

/** entailment label → evidence relation (transparent interpretation, last resort). */
function relationFromEntailment(label: EntailmentLabel | null): EvidenceRelation | null {
  if (label === "entailment") return "supporting";
  if (label === "contradiction") return "contradicting";
  if (label === "neutral") return "neutral";
  return null;
}

function normalizeStageStatus(v: unknown): StageStatus {
  const s = str(v)?.toLowerCase();
  if (s === "completed" || s === "complete" || s === "success") return "completed";
  if (s === "running" || s === "in_progress" || s === "started") return "running";
  if (s === "failed" || s === "error") return "failed";
  if (s === "skipped" || s === "not_invoked") return "skipped";
  // Unknown status: present it as skipped (the least-committal state) rather
  // than falsely claiming success or failure.
  return "skipped";
}

function normalizeRisk(v: unknown): RiskLevel | null {
  const s = str(v)?.toUpperCase();
  if (s === "LOW" || s === "MEDIUM" || s === "HIGH") return s;
  return null;
}

const STAGE_LABELS: Record<PipelineStageId, string> = {
  domain_validation: "Domain validation",
  claim_decomposition: "Claim decomposition",
  query_expansion: "Query expansion",
  retrieval: "Retrieval",
  aggregation: "Aggregation",
  reranking: "Reranking",
  nli: "NLI entailment",
  scoring: "Scoring",
  formatting: "Formatting",
};

/**
 * Owner of each stage — the honest n8n-vs-Python split.
 * n8n performs retrieval/orchestration only (retrieval + merge/dedup aggregation).
 * Python owns the judgment stages: BGE reranking, DeBERTa NLI, scoring, verdict,
 * plus the verifier's own pre-retrieval preprocessing. n8n is NEVER the judge.
 */
const STAGE_OWNER: Record<PipelineStageId, "n8n" | "python"> = {
  domain_validation: "python",
  claim_decomposition: "python",
  query_expansion: "python",
  retrieval: "n8n",
  aggregation: "n8n",
  reranking: "python",
  nli: "python",
  scoring: "python",
  formatting: "python",
};

function stageLabel(id: string): string {
  return (STAGE_LABELS as Record<string, string>)[id] ?? id.replace(/_/g, " ");
}

function stageOwner(id: string): "n8n" | "python" {
  return (STAGE_OWNER as Record<string, "n8n" | "python">)[id] ?? "python";
}

/* -------------------------------- evidence ------------------------------- */

function mapEvidence(raw: RawEvidenceItem, index: number): EvidenceVM {
  const entailmentLabel =
    normalizeEntailment(raw.entailment_label) ?? normalizeEntailment(raw.nli_label);
  const relation =
    normalizeRelation(raw.classification) ?? relationFromEntailment(entailmentLabel);

  return {
    id: `${str(raw.url) ?? str(raw.source) ?? "evidence"}-${index}`,
    title: str(raw.title),
    source: str(raw.source),
    url: str(raw.url),
    publicationDate: str(raw.publication_date),
    snippet: str(raw.snippet),
    relation,
    entailmentLabel,
    nli: {
      entailment: num(raw.nli_entailment),
      contradiction: num(raw.nli_contradiction),
      neutral: num(raw.nli_neutral),
    },
    // BGE reranker relevance. Real payloads may expose it as relevance_score.
    bgeScore: num(raw.bge_score) ?? num(raw.relevance_score),
    credibility: num(raw.credibility_score) ?? num(raw.credibility),
    inDecisionGrade: bool(raw.in_decision_grade),
  };
}

/* --------------------------------- claims -------------------------------- */

function mapClaim(raw: RawClaimReport, index: number): ClaimVM {
  const evidence = Array.isArray(raw.evidence)
    ? raw.evidence.map((e, i) => mapEvidence(e ?? {}, i))
    : [];

  // Prefer explicit source lists; otherwise count from mapped relations.
  const supportingFromList = Array.isArray(raw.supporting_sources)
    ? raw.supporting_sources.length
    : null;
  const contradictingFromList = Array.isArray(raw.contradicting_sources)
    ? raw.contradicting_sources.length
    : null;

  const supporting =
    supportingFromList ?? evidence.filter((e) => e.relation === "supporting").length;
  const contradicting =
    contradictingFromList ?? evidence.filter((e) => e.relation === "contradicting").length;

  return {
    id: str(raw.claim_id) ?? `claim-${index}`,
    text: str(raw.claim_text),
    verdict: normalizeVerdict(raw.verdict),
    explanation: str(raw.explanation),
    scores: {
      support: num(raw.support_score),
      contradiction: num(raw.contradiction_score),
      trust: num(raw.trust_score),
      confidence: num(raw.confidence_score),
    },
    counts: {
      retrieved: num(raw.retrieved_documents),
      reranked: num(raw.reranked_documents),
      verified: num(raw.verified_evidence),
      supporting,
      contradicting,
    },
    evidence,
  };
}

/* --------------------------------- stages -------------------------------- */

function mapStage(raw: RawPipelineStage): PipelineStageVM | null {
  const id = str(raw.stage);
  if (!id) return null;
  return {
    id,
    label: stageLabel(id),
    owner: stageOwner(id),
    status: normalizeStageStatus(raw.status),
    durationMs: num(raw.duration_ms),
    details: str(raw.details),
  };
}

/* --------------------------------- trace --------------------------------- */

function mapTrace(raw: RawVerificationResponse["trace"]): TraceEventVM[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => ({
    node: str(e?.node) ?? "unknown",
    status: str(e?.status) ?? "unknown",
    latencyMs: num(e?.latency_ms),
    retryCount: num(e?.retry_count),
    details: str(e?.details),
    timestamp: typeof e?.timestamp === "number" ? String(e.timestamp) : str(e?.timestamp),
  }));
}

/* ------------------------------- detector -------------------------------- */

function mapDetector(raw: RawVerificationResponse["detector"]): DetectorVM | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    hallucinationProbability: num(raw.hallucination_probability),
    confidence: num(raw.confidence_score),
    riskLevel: normalizeRisk(raw.risk_level),
    nextAction: str(raw.next_action),
    modelSource: str(raw.model_source),
    status: str(raw.status),
  };
}

function mapRuntimeModels(
  raw: NonNullable<RawVerificationResponse["verifier"]>["runtime_models"],
): RuntimeModelsVM | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    embeddingModel: str(raw.embedding_model),
    rerankerModel: str(raw.reranker_model),
    nliModel: str(raw.nli_model),
    crossEncoder: str(raw.cross_encoder),
    classificationModel: str(raw.classification_model),
    retrievalStrategy: str(raw.retrieval_strategy),
    device: str(raw.device),
    claimComplexity: str(raw.claim_complexity),
    latencyBudget: typeof raw.latency_budget === "number" ? String(raw.latency_budget) : str(raw.latency_budget),
    routingReason: str(raw.routing_reason),
  };
}

/* ------------------------------ top-level -------------------------------- */

export function mapVerification(raw: RawVerificationResponse): VerificationResult {
  const verifier = raw.verifier ?? null;
  const trace = mapTrace(raw.trace);

  const claims = Array.isArray(verifier?.claim_evidence)
    ? verifier!.claim_evidence!.map((c, i) => mapClaim(c ?? {}, i))
    : [];

  const stages = Array.isArray(verifier?.pipeline_stages)
    ? (verifier!.pipeline_stages!.map(mapStage).filter(Boolean) as PipelineStageVM[])
    : [];

  // Honest "verifier skipped" detection. The trace is authoritative: the
  // detector fast-path emits a verifier event with status "skipped".
  const verifierSkippedFromTrace = trace.some(
    (e) => e.node.toLowerCase().includes("verifier") && e.status.toLowerCase() === "skipped",
  );
  const verifierSkipped = verifierSkippedFromTrace || verifier == null;

  const detector = mapDetector(raw.detector);

  const retrieval: RetrievalSummaryVM | null = verifier
    ? {
        adapter: str(verifier.adapter),
        domain: str(verifier.domain),
        domainValidated: bool(verifier.domain_validated),
        attempted: strList(verifier.sources_attempted),
        succeeded: strList(verifier.sources_succeeded),
        failed: strList(verifier.sources_failed),
        retrievedSources: num(verifier.retrieved_sources),
        verifiedSources: num(verifier.verified_sources),
        cacheHit: bool(verifier.cache_hit),
      }
    : null;

  return {
    executionId: str(raw.execution_id),
    requestId: str(raw.request_id),
    answer: {
      model: str(raw.generation) ?? str(raw.base_llm),
      draft: str(raw.draft_response),
      final: str(raw.final_response),
    },
    verificationStatus: str(raw.verification_status),
    terminalStatus: str(raw.terminal_status),
    overallVerdict:
      normalizeVerdict(raw.verification_status) ??
      (claims.some((c) => c.verdict === "contradicted")
        ? "contradicted"
        : claims.some((c) => c.verdict === "conflicted")
        ? "conflicted"
        : claims.some((c) => c.verdict === "unverified")
        ? "unverified"
        : claims.some((c) => c.verdict === "verified")
        ? "verified"
        : null),
    overallConfidence: num(verifier?.overall_evidence_confidence),
    detector,
    verifierSkipped,
    retrieval,
    runtimeModels: mapRuntimeModels(verifier?.runtime_models),
    claims,
    stages,
    trace,
    totalLatencyMs: num(raw.total_latency_ms),
    activeAgents: strList(raw.active_agents),
    disabledAgents: strList(raw.disabled_agents),
    errors: Array.isArray(raw.errors) ? raw.errors.map((e) => String(e)) : [],
    raw,
  };
}

/** The canonical pipeline rail, merged with whatever the backend reported.
 *  Stages the backend did not report are returned with status `null` so the UI
 *  can show them as "not reported" — distinct from a truthful "skipped". */
export interface DisplayStage {
  id: PipelineStageId;
  label: string;
  owner: "n8n" | "python";
  status: StageStatus | null;
  durationMs: number | null;
  details: string | null;
  reported: boolean;
}

export function buildDisplayStages(
  reported: PipelineStageVM[],
  verifierSkipped: boolean,
): DisplayStage[] {
  const byId = new Map(reported.map((s) => [s.id, s]));
  return PIPELINE_STAGE_ORDER.map((id) => {
    const found = byId.get(id);
    if (found) {
      return {
        id,
        label: found.label,
        owner: found.owner,
        status: found.status,
        durationMs: found.durationMs,
        details: found.details,
        reported: true,
      };
    }
    return {
      id,
      label: STAGE_LABELS[id],
      owner: STAGE_OWNER[id],
      // If the verifier never ran, every stage is truthfully "skipped".
      // Otherwise we simply don't know — status stays null ("not reported").
      status: verifierSkipped ? "skipped" : null,
      durationMs: null,
      details: verifierSkipped ? "Verifier not invoked (detector fast-path)" : null,
      reported: false,
    };
  });
}

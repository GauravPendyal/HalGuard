/**
 * mock.ts — a DEV-ONLY fixture that mirrors a real `/verify` payload so the UI
 * can be built and reviewed without a running backend. Values are lifted from
 * the project's real diagnostic run (raw_diagnostic_results.json).
 *
 * Safety: this module is only ever reached when `config.mockEnabled` is true,
 * and `config.mockEnabled` is hard-forced to false in production builds (see
 * config.ts). It can never satisfy a production code path.
 */

import type { RawVerificationResponse } from "@/lib/api/types";

export const MOCK_QUERIES = [
  "Paris is the capital of France, and the Moon is made of green cheese.",
  "The Eiffel Tower is taller than the Empire State Building.",
  "Water boils at 100 degrees Celsius at sea level.",
];

export function buildMockResponse(query: string): RawVerificationResponse {
  const now = Date.now();
  return {
    execution_id: `mock-${now.toString(36)}`,
    request_id: `req-${now.toString(36)}`,
    generation: "openai/gpt-4o-mini",
    base_llm: "openai/gpt-4o-mini",
    draft_response:
      "Paris is the capital of France. The Moon is made of green cheese.",
    final_response:
      "Paris is the capital of France. The claim that the Moon is made of green cheese is a well-known figure of speech, not a factual statement — the Moon is composed of rock and mineral.",
    terminal_status: "accepted",
    verification_status: "conflicted",
    total_latency_ms: 8420,
    detector: {
      hallucination_probability: 0.61,
      confidence_score: 0.74,
      risk_level: "HIGH",
      next_action: "Verify",
      model_source: "openai/gpt-4o-mini",
      status: "completed",
    },
    active_agents: ["base_llm", "detector", "verifier", "memory"],
    disabled_agents: ["judge", "corrector"],
    judge: { enabled: false },
    corrector: { enabled: false },
    retry_count: 0,
    errors: [],
    inter_agent_bus: [],
    memory: { hits: 0 },
    audit: { schema_version: "v2" },
    verifier: {
      query_id: `q-${now.toString(36)}`,
      domain: "general",
      domain_validated: true,
      adapter: "wikipedia+tavily",
      sources_attempted: ["wikipedia", "tavily"],
      sources_succeeded: ["wikipedia"],
      sources_failed: [],
      retrieved_sources: 10,
      verified_sources: 8,
      overall_evidence_confidence: 0.41,
      latency_ms: 7960,
      cache_hit: false,
      runtime_models: {
        embedding_model: "BAAI/bge-large-en-v1.5",
        reranker_model: "BAAI/bge-reranker-large",
        nli_model: "cross-encoder/nli-deberta-v3-base",
        cross_encoder: "cross-encoder/nli-deberta-v3-base",
        classification_model: "heuristic-evidence-scorer",
        retrieval_strategy: "hybrid (domain router → primary → fallback)",
        device: "cuda",
        claim_complexity: "moderate",
        latency_budget: "standard",
        routing_reason: "Two atomic claims; general domain routed to Wikipedia primary with Tavily fallback.",
      },
      pipeline_stages: [
        { stage: "domain_validation", status: "completed", duration_ms: 120, details: "Domain 'general' validated." },
        { stage: "claim_decomposition", status: "completed", duration_ms: 340, details: "2 atomic claims extracted." },
        { stage: "query_expansion", status: "completed", duration_ms: 210, details: "Expanded each claim into a retrieval query." },
        { stage: "retrieval", status: "completed", duration_ms: 4200, details: "n8n workflow: Wikipedia primary (10 passages), Tavily fallback not needed." },
        { stage: "aggregation", status: "completed", duration_ms: 180, details: "Merged + de-duplicated to 10 unique passages." },
        { stage: "reranking", status: "completed", duration_ms: 1400, details: "BGE reranker scored + ordered passages by relevance." },
        { stage: "nli", status: "completed", duration_ms: 980, details: "DeBERTa NLI computed entailment / contradiction / neutral per passage." },
        { stage: "scoring", status: "completed", duration_ms: 260, details: "EvidenceScorer aggregated support / contradiction / trust." },
        { stage: "formatting", status: "completed", duration_ms: 70, details: "Assembled claim reports." },
      ],
      claim_evidence: [
        {
          claim_id: "claim-0",
          claim_text: "Paris is the capital of France.",
          verdict: "verified",
          support_score: 0.6767,
          contradiction_score: 0.5389,
          trust_score: 0.3985,
          confidence_score: 0.41,
          explanation:
            "Verified (39.9% trust score): 3 of 5 decision-grade sources entail this claim, led by high-relevance Wikipedia passages. Two lower-ranked passages were classified as contradictions but describe unrelated entities (a football club, a historical capitals list).",
          retrieved_documents: 5,
          reranked_documents: 5,
          verified_evidence: 5,
          supporting_sources: ["a", "b", "c"],
          contradicting_sources: ["d", "e"],
          evidence: [
            {
              title: "Wikipedia: Paris",
              source: "wikipedia",
              url: "https://en.wikipedia.org/wiki/Paris",
              publication_date: null,
              snippet:
                "Paris is the capital and largest city of France, with an estimated city population of 2.04 million in an area of 105.4 km².",
              classification: "supporting",
              entailment_label: "entailment",
              nli_label: "entailment",
              nli_entailment: 0.997679,
              nli_contradiction: 0.000044,
              nli_neutral: 0.002277,
              bge_score: 0.83275,
              relevance_score: 0.83275,
              credibility_score: 0.8,
              in_decision_grade: true,
            },
            {
              title: "Wikipedia: Paris (disambiguation)",
              source: "wikipedia",
              url: "https://en.wikipedia.org/wiki/Paris_%28disambiguation%29",
              publication_date: null,
              snippet:
                "Paris is the capital of France, which may consist of: Greater Paris; the City of Paris; …",
              classification: "supporting",
              entailment_label: "entailment",
              nli_label: "entailment",
              nli_entailment: 0.996832,
              nli_contradiction: 0.000112,
              nli_neutral: 0.003056,
              bge_score: 0.856797,
              relevance_score: 0.856797,
              credibility_score: 0.8,
              in_decision_grade: true,
            },
            {
              title: "Wikipedia: List of capitals of France",
              source: "wikipedia",
              url: "https://en.wikipedia.org/wiki/List_of_capitals_of_France",
              publication_date: null,
              snippet:
                "This is a chronological list of capitals of France. The capital of France has been Paris since its liberation in 1944. Tournai (before 486) …",
              classification: "contradicting",
              entailment_label: "contradiction",
              nli_label: "contradiction",
              nli_entailment: 0.132466,
              nli_contradiction: 0.848184,
              nli_neutral: 0.01935,
              bge_score: 0.824766,
              relevance_score: 0.824766,
              credibility_score: 0.8,
              in_decision_grade: true,
            },
            {
              title: "Wikipedia: Paris FC",
              source: "wikipedia",
              url: "https://en.wikipedia.org/wiki/Paris_FC",
              publication_date: null,
              snippet:
                "Paris FC is an association football club based in Paris, France, which competes in Ligue 1 …",
              classification: "neutral",
              entailment_label: "contradiction",
              nli_label: "contradiction",
              nli_entailment: 0.000019,
              nli_contradiction: 0.995275,
              nli_neutral: 0.004706,
              bge_score: 0.727786,
              relevance_score: 0.727786,
              credibility_score: 0.8,
              in_decision_grade: false,
            },
          ],
          retrieval_trace: { primary: "wikipedia", fallback_used: false },
        },
        {
          claim_id: "claim-1",
          claim_text: "The Moon is made of green cheese.",
          verdict: "contradicted",
          support_score: 0.11,
          contradiction_score: 0.86,
          trust_score: 0.3088,
          confidence_score: 0.52,
          explanation:
            "Contradicted (2 contradicting decision-grade sources): authoritative evidence identifies this as a fanciful saying, not a factual claim; no source entails that the Moon is composed of cheese.",
          retrieved_documents: 5,
          reranked_documents: 5,
          verified_evidence: 3,
          supporting_sources: [],
          contradicting_sources: ["a", "b"],
          evidence: [
            {
              title: "Wikipedia: The Moon is made of green cheese",
              source: "wikipedia",
              url: "https://en.wikipedia.org/wiki/The_Moon_is_made_of_green_cheese",
              publication_date: null,
              snippet:
                "\"The Moon is made of green cheese\" is a statement referring to a fanciful belief that the Moon is composed of cheese.",
              classification: "contradicting",
              entailment_label: "contradiction",
              nli_label: "contradiction",
              nli_entailment: 0.0021,
              nli_contradiction: 0.981,
              nli_neutral: 0.0169,
              bge_score: 0.79,
              relevance_score: 0.79,
              credibility_score: 0.8,
              in_decision_grade: true,
            },
            {
              title: "Wikipedia: Geology of the Moon",
              source: "wikipedia",
              url: "https://en.wikipedia.org/wiki/Geology_of_the_Moon",
              publication_date: null,
              snippet:
                "The Moon is a differentiated body with a geochemically distinct crust, mantle, and core, composed largely of silicate rock.",
              classification: "contradicting",
              entailment_label: "contradiction",
              nli_label: "contradiction",
              nli_entailment: 0.0007,
              nli_contradiction: 0.9931,
              nli_neutral: 0.0062,
              bge_score: 0.74,
              relevance_score: 0.74,
              credibility_score: 0.8,
              in_decision_grade: true,
            },
            {
              title: "Wikipedia: Green cheese",
              source: "wikipedia",
              url: "https://en.wikipedia.org/wiki/Green_cheese",
              publication_date: null,
              snippet:
                "Green cheese may refer to fresh, unaged cheese; it is unrelated to lunar composition.",
              classification: "neutral",
              entailment_label: "neutral",
              nli_label: "neutral",
              nli_entailment: 0.031,
              nli_contradiction: 0.122,
              nli_neutral: 0.847,
              bge_score: 0.58,
              relevance_score: 0.58,
              credibility_score: 0.8,
              in_decision_grade: false,
            },
          ],
          retrieval_trace: { primary: "wikipedia", fallback_used: false },
        },
      ],
    },
    trace: [
      { execution_id: "mock", node: "base_llm", status: "completed", timestamp: null, latency_ms: 640, retry_count: 0, details: "Draft generated." },
      { execution_id: "mock", node: "detector", status: "completed", timestamp: null, latency_ms: 420, retry_count: 0, details: "Risk HIGH → route to verifier." },
      { execution_id: "mock", node: "verifier", status: "completed", timestamp: null, latency_ms: 7960, retry_count: 0, details: "2 claims verified against retrieved evidence." },
      { execution_id: "mock", node: "memory", status: "completed", timestamp: null, latency_ms: 40, retry_count: 0, details: "No prior context." },
      { execution_id: "mock", node: "accept", status: "completed", timestamp: null, latency_ms: 0, retry_count: 0, details: "Response accepted with verification report." },
    ],
  };
}

/**
 * A second fixture demonstrating the detector fast-path: the detector accepts a
 * low-risk answer and the verifier is TRULY skipped — the UI must show this
 * honestly rather than faking pipeline activity.
 */
export function buildMockFastPath(query: string): RawVerificationResponse {
  const now = Date.now();
  return {
    execution_id: `mock-fast-${now.toString(36)}`,
    request_id: `req-${now.toString(36)}`,
    generation: "openai/gpt-4o-mini",
    base_llm: "openai/gpt-4o-mini",
    draft_response: "Water boils at 100 °C at sea level.",
    final_response: "Water boils at 100 °C at sea level.",
    terminal_status: "accepted",
    verification_status: "unverified",
    total_latency_ms: 1060,
    detector: {
      hallucination_probability: 0.08,
      confidence_score: 0.93,
      risk_level: "LOW",
      next_action: "Accept",
      model_source: "openai/gpt-4o-mini",
      status: "completed",
    },
    active_agents: ["base_llm", "detector"],
    disabled_agents: ["judge", "corrector"],
    judge: { enabled: false },
    corrector: { enabled: false },
    retry_count: 0,
    errors: [],
    inter_agent_bus: [],
    memory: null,
    audit: { schema_version: "v2" },
    verifier: null,
    trace: [
      { execution_id: "mock", node: "base_llm", status: "completed", timestamp: null, latency_ms: 620, retry_count: 0, details: "Draft generated." },
      { execution_id: "mock", node: "detector", status: "completed", timestamp: null, latency_ms: 440, retry_count: 0, details: "Risk LOW → accept without verification." },
      { execution_id: "mock", node: "verifier", status: "skipped", timestamp: null, latency_ms: 0, retry_count: 0, details: "Detector fast-path: verifier not invoked." },
      { execution_id: "mock", node: "accept", status: "completed", timestamp: null, latency_ms: 0, retry_count: 0, details: "Response accepted." },
    ],
  };
}

/** Choose a fixture based on the query so dev exploration shows both paths. */
export function mockFor(query: string): RawVerificationResponse {
  const q = query.toLowerCase();
  if (q.includes("boil") || q.includes("fast") || q.length < 40) {
    return buildMockFastPath(query);
  }
  return buildMockResponse(query);
}

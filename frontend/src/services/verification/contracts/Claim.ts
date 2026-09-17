export interface ClaimContract {
  id: string;
  claim_text: string;
  status: 'verified' | 'corrected' | 'rejected';
  confidence_score: number;
  evidence_ref_url?: string;
  evidence_snippet?: string;
}

export interface EvidenceContract {
  source_name: string;
  trust_score: number;
  relevance: number;
  snippet_text: string;
  latency_ms: number;
  uri: string;
}

export interface MemoryContract {
  memory_id: string;
  vector_dimension: number;
  indexed_facts_count: number;
}

export interface CertificateContract {
  certificate_id: string;
  timestamp: string;
  execution_ms: number;
  claims_verified_count: number;
  sources_count: number;
  trust_score: number;
}

export interface ReplayContract {
  session_id: string;
  recorded_events_count: number;
}

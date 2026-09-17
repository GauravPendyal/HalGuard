import { AgentId } from '@/types';

export interface AgentDescriptor {
  id: AgentId;
  name: string;
  role: string;
  endpoint: string;
  status: 'ONLINE' | 'STANDBY' | 'DEGRADED';
  capabilities: string[];
}

export class AgentRegistry {
  private static agents = new Map<AgentId, AgentDescriptor>([
    ['llm', { id: 'llm', name: 'LLM Reasoner Agent', role: 'Candidate Generation', endpoint: '/api/v1/agents/llm', status: 'ONLINE', capabilities: ['streaming', 'reasoning'] }],
    ['detector', { id: 'detector', name: 'Detector Investigator Agent', role: 'Claim Extraction', endpoint: '/api/v1/agents/detector', status: 'ONLINE', capabilities: ['entity_extraction', 'risk_scoring'] }],
    ['verifier', { id: 'verifier', name: 'Verifier Archivist Agent', role: 'Evidence Retrieval', endpoint: '/api/v1/agents/verifier', status: 'ONLINE', capabilities: ['web_search', 'doi_lookup'] }],
    ['judge', { id: 'judge', name: 'Judge Arbiter Agent', role: 'Bayesian Scoring', endpoint: '/api/v1/agents/judge', status: 'ONLINE', capabilities: ['consensus_scoring'] }],
    ['corrector', { id: 'corrector', name: 'Corrector Refiner Agent', role: 'Diff Patching', endpoint: '/api/v1/agents/corrector', status: 'ONLINE', capabilities: ['diff_patching', 'citation_generation'] }],
    ['memory', { id: 'memory', name: 'Memory Keeper Agent', role: 'Vector Indexing', endpoint: '/api/v1/agents/memory', status: 'ONLINE', capabilities: ['vector_indexing', 'cache_lookup'] }],
  ]);

  static getAgent(id: AgentId): AgentDescriptor | undefined {
    return this.agents.get(id);
  }

  static getAllAgents(): AgentDescriptor[] {
    return Array.from(this.agents.values());
  }
}

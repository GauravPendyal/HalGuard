export interface WorkflowProfile {
  id: string;
  name: string;
  category: string;
  agents: string[];
  strictnessThreshold: number;
  maxParallelSources: number;
}

export class WorkflowDefinitions {
  private static workflows = new Map<string, WorkflowProfile>([
    ['research', { id: 'research', name: 'Academic & PubMed Research Workflow', category: 'Research', agents: ['llm', 'detector', 'verifier', 'judge', 'corrector', 'memory'], strictnessThreshold: 90, maxParallelSources: 20 }],
    ['medical', { id: 'medical', name: 'Clinical & mRNA Dosage Workflow', category: 'Medical', agents: ['llm', 'detector', 'verifier', 'judge', 'corrector', 'memory'], strictnessThreshold: 98, maxParallelSources: 30 }],
    ['finance', { id: 'finance', name: 'SEC 10-K & Audit Workflow', category: 'Finance', agents: ['llm', 'detector', 'verifier', 'judge', 'corrector', 'memory'], strictnessThreshold: 95, maxParallelSources: 15 }],
    ['legal', { id: 'legal', name: 'Supreme Court & Case Precedent Workflow', category: 'Legal', agents: ['llm', 'detector', 'verifier', 'judge', 'corrector', 'memory'], strictnessThreshold: 92, maxParallelSources: 15 }],
    ['general', { id: 'general', name: 'Standard HalluciGuard Guard Workflow', category: 'General', agents: ['llm', 'detector', 'verifier', 'judge', 'corrector', 'memory'], strictnessThreshold: 85, maxParallelSources: 10 }],
  ]);

  static getProfile(id: string): WorkflowProfile {
    return this.workflows.get(id) || this.workflows.get('general')!;
  }
}

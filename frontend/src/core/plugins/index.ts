export interface IVerificationPlugin {
  id: string;
  name: string;
  version: string;
  initialize(): Promise<void>;
}

export interface IEvidencePlugin extends IVerificationPlugin {
  fetchEvidence(query: string): Promise<unknown[]>;
}

export interface IExportPlugin extends IVerificationPlugin {
  exportFormat: string;
  exportReport(data: unknown): Promise<Blob>;
}

export interface IAgentPlugin extends IVerificationPlugin {
  agentType: string;
  process(input: unknown): Promise<unknown>;
}

import { verificationService } from '@/services/verification';

export interface SystemCapabilities {
  streaming: boolean;
  replay: boolean;
  memory: boolean;
  explainability: boolean;
  evidence: boolean;
  certificates: boolean;
  images: boolean;
  multiAgent: boolean;
  longContext: boolean;
}

export class CapabilityManager {
  static getCapabilities(): SystemCapabilities {
    const adapterCaps = verificationService.getCapabilities();
    return {
      streaming: adapterCaps.supportsStreaming,
      replay: adapterCaps.supportsReplay,
      memory: adapterCaps.supportsMemory,
      explainability: adapterCaps.supportsExplainability,
      evidence: true,
      certificates: adapterCaps.supportsReports,
      images: adapterCaps.supportsImages,
      multiAgent: adapterCaps.supportsMultiAgent,
      longContext: true,
    };
  }

  static hasCapability(cap: keyof SystemCapabilities): boolean {
    return this.getCapabilities()[cap];
  }
}

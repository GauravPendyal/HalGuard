export interface FeatureFlags {
  enableReplay: boolean;
  enableExplainability: boolean;
  enableDeveloperMode: boolean;
  enablePlayground: boolean;
  enableExperimentalDAG: boolean;
  enableCertificates: boolean;
  enableAdvancedEvidence: boolean;
}

export class FeatureFlagManager {
  private static flags: FeatureFlags = {
    enableReplay: true,
    enableExplainability: true,
    enableDeveloperMode: true,
    enablePlayground: true,
    enableExperimentalDAG: true,
    enableCertificates: true,
    enableAdvancedEvidence: true,
  };

  static isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  static getFlags(): FeatureFlags {
    return { ...this.flags };
  }
}

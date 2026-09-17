export type EnvironmentProfile = 'development' | 'demo' | 'testing' | 'production';

export class RuntimeConfig {
  static profile: EnvironmentProfile = 'demo';

  static isDemo(): boolean {
    return this.profile === 'demo';
  }

  static getProfile(): EnvironmentProfile {
    return this.profile;
  }
}

export class ObservabilityManager {
  private static metrics: Record<string, number> = {
    verificationsTriggered: 0,
    successfulVerifications: 0,
    failedVerifications: 0,
    averageLatencyMs: 340,
  };

  static trackMetric(key: string, value: number = 1) {
    this.metrics[key] = (this.metrics[key] || 0) + value;
  }

  static getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }
}

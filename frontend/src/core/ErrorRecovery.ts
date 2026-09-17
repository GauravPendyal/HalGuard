export class ErrorRecovery {
  static async executeWithRetry<T>(fn: () => Promise<T>, retries: number = 3, delayMs: number = 500): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (retries <= 0) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
      return this.executeWithRetry(fn, retries - 1, delayMs * 2);
    }
  }
}

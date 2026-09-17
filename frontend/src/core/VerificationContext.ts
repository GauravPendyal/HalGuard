import { VerificationMode } from '@/types';

export interface VerificationContextOptions {
  prompt: string;
  mode: VerificationMode;
  model: string;
  temperature?: number;
  evidenceDepth?: 'shallow' | 'standard' | 'deep';
  retryPolicy?: { maxRetries: number; backoffMs: number };
  timeoutMs?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export class VerificationContext {
  readonly sessionId: string;
  readonly prompt: string;
  readonly mode: VerificationMode;
  readonly model: string;
  readonly temperature: number;
  readonly evidenceDepth: string;
  readonly timeoutMs: number;
  readonly metadata: Record<string, unknown>;

  constructor(options: VerificationContextOptions) {
    this.sessionId = options.sessionId || `ctx-${Date.now()}`;
    this.prompt = options.prompt;
    this.mode = options.mode;
    this.model = options.model;
    this.temperature = options.temperature ?? 0.1;
    this.evidenceDepth = options.evidenceDepth ?? 'standard';
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.metadata = options.metadata ?? {};
  }
}

export interface RecordedSession {
  sessionId: string;
  timestamp: string;
  prompt: string;
  verifiedResponse: string;
  overallConfidence: number;
  claimsCount: number;
  sourcesCount: number;
  totalExecutionTimeMs: number;
}

export class VerificationRepository {
  private static sessions: Map<string, RecordedSession> = new Map();

  static saveSession(session: RecordedSession) {
    this.sessions.set(session.sessionId, session);
  }

  static getSession(sessionId: string): RecordedSession | undefined {
    return this.sessions.get(sessionId);
  }

  static getAllSessions(): RecordedSession[] {
    return Array.from(this.sessions.values());
  }
}

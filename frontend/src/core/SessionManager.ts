import { VerificationRepository, RecordedSession } from '@/services/verification/VerificationRepository';

export class SessionManager {
  static createSession(prompt: string): string {
    const id = `session-${Date.now()}`;
    const newSession: RecordedSession = {
      sessionId: id,
      timestamp: new Date().toISOString(),
      prompt,
      verifiedResponse: '',
      overallConfidence: 0,
      claimsCount: 0,
      sourcesCount: 0,
      totalExecutionTimeMs: 0,
    };
    VerificationRepository.saveSession(newSession);
    return id;
  }

  static getActiveSession(sessionId: string): RecordedSession | undefined {
    return VerificationRepository.getSession(sessionId);
  }

  static listSessions(): RecordedSession[] {
    return VerificationRepository.getAllSessions();
  }
}

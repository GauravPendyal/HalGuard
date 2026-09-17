import { eventBus, VerificationEventType } from '@/engine';

export interface RecordedEventItem {
  id: string;
  type: VerificationEventType;
  timestamp: string;
  payload: unknown;
}

export class EventRecorder {
  private static recordedEvents: RecordedEventItem[] = [];

  static record(type: VerificationEventType, payload: unknown) {
    this.recordedEvents.push({
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  static getHistory(): RecordedEventItem[] {
    return [...this.recordedEvents];
  }

  static clear() {
    this.recordedEvents = [];
    eventBus.clearHistory();
  }
}

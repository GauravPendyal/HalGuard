import { EventPayloadMap, VerificationEventType } from './events';

type EventHandler<K extends VerificationEventType> = (payload: EventPayloadMap[K]) => void;

class EventBus {
  private listeners: Map<VerificationEventType, ((payload: unknown) => void)[]> = new Map();
  private history: { type: VerificationEventType; payload: unknown }[] = [];

  on<K extends VerificationEventType>(event: K, handler: EventHandler<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const handlers = this.listeners.get(event)!;
    handlers.push(handler as (payload: unknown) => void);

    return () => {
      const current = this.listeners.get(event) || [];
      this.listeners.set(
        event,
        current.filter((h) => h !== (handler as (payload: unknown) => void))
      );
    };
  }

  emit<K extends VerificationEventType>(event: K, payload: EventPayloadMap[K]): void {
    this.history.push({ type: event, payload });
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => (handler as EventHandler<K>)(payload));
    }
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }
}

export const eventBus = new EventBus();

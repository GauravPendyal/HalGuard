import { ITransport, TransportCapabilities } from './ITransport';
import { eventBus } from '@/engine';

export class HttpTransport implements ITransport {
  type = 'http' as const;
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async send<T = unknown>(): Promise<T> {
    return {} as T;
  }
  onMessage(): () => void {
    return () => {};
  }
  getCapabilities(): TransportCapabilities {
    return { supportsStreaming: false, supportsBiDirectional: false, supportsAutoReconnect: false };
  }
}

export class WebSocketTransport implements ITransport {
  type = 'websocket' as const;
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async send<T = unknown>(): Promise<T> {
    return {} as T;
  }
  onMessage(): () => void {
    return () => {};
  }
  getCapabilities(): TransportCapabilities {
    return { supportsStreaming: true, supportsBiDirectional: true, supportsAutoReconnect: true };
  }
}

export class SSETransport implements ITransport {
  type = 'sse' as const;
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async send<T = unknown>(): Promise<T> {
    return {} as T;
  }
  onMessage(): () => void {
    return () => {};
  }
  getCapabilities(): TransportCapabilities {
    return { supportsStreaming: true, supportsBiDirectional: false, supportsAutoReconnect: true };
  }
}

export class EventTransport implements ITransport {
  type = 'eventbus' as const;
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async send<T = unknown>(): Promise<T> {
    return {} as T;
  }
  onMessage(callback: (data: unknown) => void): () => void {
    return eventBus.on('PROMPT_SUBMITTED', callback as never);
  }
  getCapabilities(): TransportCapabilities {
    return { supportsStreaming: true, supportsBiDirectional: true, supportsAutoReconnect: true };
  }
}

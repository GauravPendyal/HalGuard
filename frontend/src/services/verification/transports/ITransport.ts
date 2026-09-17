export interface TransportCapabilities {
  supportsStreaming: boolean;
  supportsBiDirectional: boolean;
  supportsAutoReconnect: boolean;
}

export interface ITransport {
  type: 'http' | 'websocket' | 'sse' | 'eventbus';
  connect(url?: string): Promise<void>;
  disconnect(): Promise<void>;
  send<T = unknown>(payload: unknown): Promise<T>;
  onMessage(callback: (data: unknown) => void): () => void;
  getCapabilities(): TransportCapabilities;
}

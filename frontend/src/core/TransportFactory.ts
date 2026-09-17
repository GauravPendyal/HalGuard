import { ITransport } from '@/services/verification/transports/ITransport';
import {
  HttpTransport,
  WebSocketTransport,
  SSETransport,
  EventTransport,
} from '@/services/verification/transports/HttpTransport';

export type TransportType = 'http' | 'websocket' | 'sse' | 'eventbus';

export class TransportFactory {
  static createTransport(type: TransportType): ITransport {
    switch (type) {
      case 'websocket':
        return new WebSocketTransport();
      case 'sse':
        return new SSETransport();
      case 'http':
        return new HttpTransport();
      case 'eventbus':
      default:
        return new EventTransport();
    }
  }
}

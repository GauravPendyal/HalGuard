import { eventBus } from './eventBus';
import { sleep } from '@/lib/utils';

export async function replayEvents() {
  const history = eventBus.getHistory();
  if (history.length === 0) return;

  for (const item of history) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventBus.emit(item.type, item.payload as any);
    await sleep(200);
  }
}

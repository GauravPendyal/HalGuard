'use client';

import * as React from 'react';
import { eventBus, VerificationEventType } from '@/engine';
import { Play, Pause, Trash2, RotateCcw, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface InspectorEvent {
  id: string;
  type: VerificationEventType;
  timestamp: string;
  latencyMs: number;
  payloadSize: string;
  status: 'DELIVERED' | 'PENDING' | 'DROPPED';
  origin: string;
  target: string;
  payload: unknown;
}

export function EventInspector() {
  const [events, setEvents] = React.useState<InspectorEvent[]>([]);
  const [isPaused, setIsPaused] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('ALL');

  React.useEffect(() => {
    const handleEvent = (type: VerificationEventType, payload: unknown) => {
      if (isPaused) return;

      const newEvent: InspectorEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type,
        timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
        latencyMs: Math.floor(12 + Math.random() * 45),
        payloadSize: `${(JSON.stringify(payload).length / 1024).toFixed(2)} KB`,
        status: 'DELIVERED',
        origin: 'EventEngine:PubSub',
        target: 'UI:SubscriberGroup',
        payload,
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
    };

    const types: VerificationEventType[] = [
      'PROMPT_SUBMITTED',
      'LLM_DRAFT_STARTED',
      'LLM_DRAFT_STREAM',
      'LLM_DRAFT_COMPLETED',
      'CLAIMS_EXTRACTED',
      'EVIDENCE_DISCOVERED',
      'CONSENSUS_UPDATED',
      'CORRECTION_STARTED',
      'CORRECTION_COMPLETED',
      'MEMORY_UPDATED',
      'VERIFICATION_COMPLETED',
      'REPORT_GENERATED',
    ];

    const unsubs = types.map((t) => eventBus.on(t, (p) => handleEvent(t, p)));

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [isPaused]);

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(e.payload).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || e.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full space-y-3 font-mono text-xs select-none">
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-zinc-950 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPaused(!isPaused)}
            className="gap-1.5 text-xs"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setEvents([])}
            className="gap-1.5 text-xs text-red-400 border-red-950/60 hover:bg-red-950/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const history = eventBus.getHistory();
              history.forEach((h) => {
                eventBus.emit(h.type, h.payload as never);
              });
            }}
            className="gap-1.5 text-xs text-blue-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Bus History</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search event payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 outline-none w-48 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="PROMPT_SUBMITTED">PROMPT_SUBMITTED</option>
              <option value="LLM_DRAFT_STREAM">LLM_DRAFT_STREAM</option>
              <option value="CLAIMS_EXTRACTED">CLAIMS_EXTRACTED</option>
              <option value="EVIDENCE_DISCOVERED">EVIDENCE_DISCOVERED</option>
              <option value="CONSENSUS_UPDATED">CONSENSUS_UPDATED</option>
              <option value="CORRECTION_COMPLETED">CORRECTION_COMPLETED</option>
              <option value="VERIFICATION_COMPLETED">VERIFICATION_COMPLETED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Table / Stream */}
      <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 overflow-y-auto p-2 space-y-1.5">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <span>No events captured in current stream</span>
            <span className="text-[10px] text-zinc-600 mt-1">Submit a prompt to inspect live event bus traffic</span>
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-1"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{evt.type}</span>
                  <span className="text-zinc-500 text-[10px]">{evt.timestamp}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                  <span className="text-blue-400">{evt.latencyMs}ms</span>
                  <span className="text-purple-400">{evt.payloadSize}</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {evt.status}
                  </span>
                </div>
              </div>
              <pre className="text-[10px] text-zinc-400 bg-zinc-950 p-1.5 rounded border border-zinc-800/60 overflow-x-auto">
                {JSON.stringify(evt.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

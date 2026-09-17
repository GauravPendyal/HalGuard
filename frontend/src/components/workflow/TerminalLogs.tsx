'use client';

import * as React from 'react';
import { eventBus } from '@/engine';
import { Terminal as TerminalIcon, Copy, Download, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LogEntry {
  time: string;
  text: string;
  type: 'info' | 'cmd' | 'success';
}

export function TerminalLogs() {
  const [logs, setLogs] = React.useState<LogEntry[]>([
    { time: '15:00:00.000', text: '$ HalluciGuard telemetry service initialized', type: 'info' },
  ]);
  const [filter, setFilter] = React.useState<string>('ALL');
  const [search, setSearch] = React.useState<string>('');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const addLog = (text: string, type: 'info' | 'cmd' | 'success' = 'info') => {
      const time = new Date().toTimeString().split(' ')[0] + '.' + new Date().getMilliseconds().toString().padStart(3, '0');
      setLogs((prev) => [...prev, { time, text, type }]);
    };

    const u1 = eventBus.on('PROMPT_SUBMITTED', (p) => addLog(`$ Prompt received: "${p.prompt}"`, 'cmd'));
    const u2 = eventBus.on('LLM_DRAFT_STARTED', () => addLog('✓ Reasoner LLM draft generation started', 'success'));
    const u3 = eventBus.on('CLAIMS_EXTRACTED', (p) => addLog(`✓ Investigator extracted ${p.claims.length} claims`, 'success'));
    const u4 = eventBus.on('EVIDENCE_DISCOVERED', (p) => addLog(`$ Archivist discovered ${p.evidence.length} ground truth sources`, 'cmd'));
    const u5 = eventBus.on('CONSENSUS_UPDATED', (p) => addLog(`[CONSENSUS] Arbiter truth score: ${p.confidence}%`, 'info'));
    const u6 = eventBus.on('CORRECTION_COMPLETED', () => addLog('✓ Refiner applied diff patch', 'success'));
    const u7 = eventBus.on('VERIFICATION_COMPLETED', (p) => addLog(`[SUCCESS] Verification complete. Cert: ${p.certificateId}`, 'success'));

    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
    };
  }, []);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter((l) => {
    const matchesFilter = filter === 'ALL' || l.type === filter;
    const matchesSearch = l.text.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950 font-mono text-xs text-zinc-300 border-t border-zinc-800 select-none">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-zinc-800/80 bg-zinc-900/60">
        <div className="flex items-center gap-2 text-zinc-400">
          <TerminalIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Live System Logs</span>
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 px-2 text-[10px]">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 px-2 text-[10px]">
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between p-2 border-b border-zinc-800/60 gap-2">
        <div className="relative flex-1">
          <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded pl-6 pr-2 py-0.5 text-[10px] text-zinc-300 outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-400 outline-none"
        >
          <option value="ALL">All Severity</option>
          <option value="cmd">Commands ($)</option>
          <option value="success">Success (✓)</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Logs Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1.5">
        {filteredLogs.map((log, idx) => (
          <div key={idx} className="leading-relaxed flex items-start gap-2 text-[11px]">
            <span className="text-zinc-600 text-[10px] shrink-0">{log.time}</span>
            <span
              className={
                log.type === 'cmd'
                  ? 'text-blue-400 font-semibold'
                  : log.type === 'success'
                  ? 'text-emerald-400 font-semibold'
                  : 'text-zinc-300'
              }
            >
              {log.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

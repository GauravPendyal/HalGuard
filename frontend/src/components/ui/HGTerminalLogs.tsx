'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal, Copy, Check, Shield } from 'lucide-react';

export interface LogEntry {
  id?: string;
  timestamp: string;
  agentId: string;
  messageType: string;
  payload?: any;
  status?: string;
}

interface HGTerminalLogsProps {
  logs?: LogEntry[];
  className?: string;
}

export function HGTerminalLogs({ logs = [], className }: HGTerminalLogsProps) {
  const [copied, setCopied] = React.useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const defaultLogs: LogEntry[] = [
    { timestamp: '00:00.012', agentId: 'supervisor', messageType: 'PIPELINE_INIT', payload: { mode: 'normal', engine: 'LangGraph v2' } },
    { timestamp: '00:00.084', agentId: 'base_llm', messageType: 'GENERATION_STARTED', payload: { model: 'openrouter/qwen-2.5-7b' } },
    { timestamp: '00:01.160', agentId: 'base_llm', messageType: 'DRAFT_SYNTHESIZED', payload: { tokens: 42, latency_ms: 1076 } },
    { timestamp: '00:01.215', agentId: 'detector', messageType: 'HALUEVAL_INFERENCE', payload: { prob: 0.08, risk: 'LOW' } },
    { timestamp: '00:01.440', agentId: 'supervisor', messageType: 'ROUTING_DECISION', payload: { route: 'accept', fast_path: true } },
    { timestamp: '00:01.455', agentId: 'memory', messageType: 'VECTOR_PERSISTED', payload: { facts_indexed: 1 } },
  ];

  const items = logs.length > 0 ? logs : defaultLogs;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(items, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`surface-beta rounded-2xl p-5 flex flex-col font-mono-code ${className || ''}`}>
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
            Telemetry Event Stream
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy JSON'}</span>
        </button>
      </div>

      <div className="bg-[#03060B] rounded-xl p-3.5 border border-white/5 overflow-y-auto max-h-56 text-[11px] space-y-2">
        {items.map((log, idx) => (
          <div key={log.id || idx} className="flex items-start gap-2.5 leading-relaxed">
            <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
            <span className="text-sky-400 font-semibold shrink-0 uppercase">@{log.agentId}</span>
            <span className="text-slate-300">{log.messageType}</span>
            {log.payload && (
              <span className="text-slate-500 truncate max-w-[280px]">
                {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload)}
              </span>
            )}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

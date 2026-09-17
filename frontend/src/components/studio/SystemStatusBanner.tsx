'use client';

import * as React from 'react';
import { ShieldCheck, Cpu, Database, Activity, Sparkles } from 'lucide-react';

export function SystemStatusBanner() {
  const statusItems = [
    { label: 'Engine Ready', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> },
    { label: '6 Agents Loaded', icon: <Cpu className="w-3.5 h-3.5 text-blue-400" /> },
    { label: 'Verification Engine Online', icon: <Activity className="w-3.5 h-3.5 text-emerald-400" /> },
    { label: 'Memory Initialized', icon: <Database className="w-3.5 h-3.5 text-cyan-400" /> },
    { label: 'Mock Data Active', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" /> },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto my-4 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-300">
            System Telemetry Status
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {statusItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-300">
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { Activity, ShieldCheck, Zap, AlertTriangle, Layers, Server } from 'lucide-react';

export function EventBusMonitor() {
  const metrics = [
    { label: 'Current Event Queue', value: '0 pending', icon: <Layers className="w-4 h-4 text-blue-400" /> },
    { label: 'Active Subscribers', value: '14 listeners', icon: <Server className="w-4 h-4 text-emerald-400" /> },
    { label: 'Delivered Events', value: '1,428 total', icon: <ShieldCheck className="w-4 h-4 text-purple-400" /> },
    { label: 'Pending Queue', value: '0 events', icon: <Activity className="w-4 h-4 text-amber-400" /> },
    { label: 'Dropped Events', value: '0 dropped', icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
    { label: 'Avg Delivery Latency', value: '1.24 ms', icon: <Zap className="w-4 h-4 text-cyan-400" /> },
    { label: 'Avg Processing Time', value: '4.82 ms', icon: <Zap className="w-4 h-4 text-emerald-400" /> },
  ];

  return (
    <div className="space-y-4 select-none font-mono text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((m, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[10px]">{m.label}</span>
              {m.icon}
            </div>
            <div className="text-sm font-bold text-zinc-100">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
        <h4 className="text-xs font-semibold text-zinc-200 font-sans">Event Engine Subsystem Diagnostics</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-zinc-400">
          <div className="p-2 rounded bg-zinc-900 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px]">Bus Throughput</span>
            <span className="text-emerald-400 font-bold">120 events/sec</span>
          </div>
          <div className="p-2 rounded bg-zinc-900 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px]">Buffer Capacity</span>
            <span className="text-blue-400 font-bold">10,000 slots</span>
          </div>
          <div className="p-2 rounded bg-zinc-900 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px]">Garbage Collection</span>
            <span className="text-purple-400 font-bold">Automatic (0 leaks)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

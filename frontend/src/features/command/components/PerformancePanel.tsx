'use client';

import * as React from 'react';
import { Gauge, Cpu, HardDrive, Sparkles, RefreshCw } from 'lucide-react';

export function PerformancePanel() {
  const [fps, setFps] = React.useState(60);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(58 + Math.random() * 3));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">FPS Frame Rate</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400">{fps} FPS</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">Render Latency</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-sm font-bold text-blue-400">4.2 ms</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">Heap Memory</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-purple-400">42.8 MB</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">Active Animations</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-amber-400">18 Framer Nodes</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">React Render Count</span>
            <RefreshCw className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-cyan-400">14 Renders</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">Component Updates</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400">62 Sub-updates</div>
        </div>
      </div>
    </div>
  );
}

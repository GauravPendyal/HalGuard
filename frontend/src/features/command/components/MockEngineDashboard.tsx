'use client';

import * as React from 'react';
import { Cpu, CheckCircle2, Zap, Gauge, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function MockEngineDashboard() {
  const [speed, setSpeed] = React.useState<number>(1);

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">Engine Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400">READY</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">Events Generated</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-sm font-bold text-zinc-100">12 / Session</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">Current Phase</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-purple-400">IDLE</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px]">Engine Health</span>
            <HeartPulse className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400">100% HEALTHY</div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-sans font-semibold text-zinc-200 text-xs flex items-center gap-2">
            <Gauge className="w-4 h-4 text-amber-400" />
            <span>Simulation Speed Multiplier</span>
          </span>
          <span className="text-amber-400 font-bold">{speed}x Speed</span>
        </div>

        <div className="flex items-center gap-2">
          {[0.5, 1, 2, 5].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={speed === s ? 'glow' : 'outline'}
              onClick={() => setSpeed(s)}
              className="text-xs flex-1"
            >
              {s}x
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

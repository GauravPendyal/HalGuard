'use client';

import * as React from 'react';
import { Sliders, Wifi, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function WorkflowSimulator() {
  const [simulationMode, setSimulationMode] = React.useState<string>('normal');

  const modes = [
    { id: 'normal', name: 'Normal Fast Pass (1x)', desc: 'Standard mock engine performance' },
    { id: 'slow_network', name: 'Slow Network Simulation (3x)', desc: 'Simulate high latency microservice hops' },
    { id: 'timeout', name: 'Timeout Simulation', desc: 'Simulate 15s API timeout condition' },
    { id: 'agent_failure', name: 'Agent Degradation Mode', desc: 'Simulate Refiner agent diff patch failure' },
    { id: 'partial_evidence', name: 'Partial Evidence Mode', desc: 'Simulate low ground-truth source availability' },
    { id: 'packet_loss', name: 'WebSocket Packet Loss (10%)', desc: 'Simulate intermittent frame loss' },
  ];

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-zinc-200">Active Simulation Mode:</span>
          <span className="text-emerald-400 font-bold uppercase">{simulationMode}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setSimulationMode('normal')} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
          <span>Reset to Normal</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setSimulationMode(m.id)}
            className={`p-3 rounded-xl border text-left transition-all backdrop-blur-md ${
              simulationMode === m.id
                ? 'bg-blue-950/40 border-blue-500/60 shadow-lg'
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-100 flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                {m.name}
              </span>
              {simulationMode === m.id && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">{m.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

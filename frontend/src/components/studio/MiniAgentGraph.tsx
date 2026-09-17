'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Search, CheckCircle2, Database, ShieldAlert, Sparkles } from 'lucide-react';
import { INITIAL_AGENTS } from '@/lib/mockData';

export function MiniAgentGraph() {
  const iconMap: Record<string, React.ReactNode> = {
    llm: <Cpu className="w-3.5 h-3.5 text-purple-400" />,
    detector: <Search className="w-3.5 h-3.5 text-amber-400" />,
    verifier: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    memory: <Database className="w-3.5 h-3.5 text-cyan-400" />,
    judge: <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />,
    corrector: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />,
  };

  const borderColors: Record<string, string> = {
    llm: 'border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
    detector: 'border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    verifier: 'border-emerald-500/30 shadow-[0_0_12px_rgba(34,197,94,0.15)]',
    memory: 'border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
    judge: 'border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
    corrector: 'border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]',
  };

  return (
    <div className="w-full space-y-3 p-3">
      {/* Mini SVG Flow Diagram */}
      <div className="relative w-full h-32 rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-2 overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 300 100" className="w-full h-full">
          {/* Animated Connecting Lines */}
          <path d="M 150 15 L 150 40" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 150 40 L 90 65" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 150 40 L 210 65" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 90 65 L 150 90" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 210 65 L 150 90" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Mini Nodes */}
          <circle cx="150" cy="15" r="7" fill="#a855f7" />
          <circle cx="150" cy="40" r="7" fill="#f59e0b" />
          <circle cx="90" cy="65" r="7" fill="#22c55e" />
          <circle cx="210" cy="65" r="7" fill="#06b6d4" />
          <circle cx="150" cy="90" r="7" fill="#3b82f6" />
        </svg>
      </div>

      {/* Agent Telemetry Cards List */}
      <div className="space-y-2">
        {INITIAL_AGENTS.map((agent) => (
          <motion.div
            key={agent.id}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 3 + (agent.name.length % 2), repeat: Infinity, ease: 'easeInOut' }}
            className={`flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/90 border backdrop-blur-md ${
              borderColors[agent.id]
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                {iconMap[agent.id]}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-200">{agent.name}</span>
                <span className="text-[10px] text-zinc-500 truncate max-w-[170px]">
                  {agent.description}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>IDLE</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

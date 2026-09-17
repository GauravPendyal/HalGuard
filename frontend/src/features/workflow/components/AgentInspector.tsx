'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { INITIAL_AGENTS } from '@/lib/mockData';
import { X, Cpu, Clock, Terminal, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function AgentInspector() {
  const { selectedAgentId, setSelectedAgentId } = useChatStore();

  if (!selectedAgentId) return null;

  const agent = INITIAL_AGENTS.find((a) => a.id === selectedAgentId);
  if (!agent) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 p-6 h-full overflow-y-auto space-y-5 select-none shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">{agent.name}</h3>
                <span className="text-xs text-zinc-400 font-mono uppercase">{agent.id} Agent Node</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedAgentId(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status & Latency Pills */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Current Status</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {agent.status.toUpperCase()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Average Latency</span>
              <span className="text-blue-400 font-bold flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5" /> {agent.executionTimeMs}ms
              </span>
            </div>
          </div>

          {/* Purpose & Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-300">Agent Specification & Purpose</span>
            <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
              {agent.description}
            </p>
          </div>

          {/* I/O Specifications */}
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] block">Input Stream Schema</span>
              <div className="text-blue-400 flex items-center gap-2">
                <span>PromptTokens</span> <ArrowRight className="w-3 h-3 text-zinc-600" /> <span>RawCandidateText</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] block">Output Stream Schema</span>
              <div className="text-emerald-400 flex items-center gap-2">
                <span>VerifiedClaimObject[]</span> <ArrowRight className="w-3 h-3 text-zinc-600" /> <span>ProofPayload</span>
              </div>
            </div>
          </div>

          {/* Execution History & Mock Logs */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span>Execution Logs & Telemetry</span>
            </span>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] space-y-1.5 text-zinc-400">
              <div className="text-zinc-500">[15:00:01.042] Initializing agent sub-context</div>
              <div className="text-blue-400">[15:00:01.120] Querying vector embeddings</div>
              <div className="text-emerald-400">[15:00:01.340] Execution completed successfully</div>
            </div>
          </div>

          {/* Future Integration Blueprint */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 space-y-2">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Backend Microservice Route</span>
            </span>
            <div className="font-mono text-[11px] text-zinc-400 space-y-1">
              <div>Route: <span className="text-blue-400">/api/v1/agents/{agent.id}/process</span></div>
              <div>Model: <span className="text-purple-400">langgraph-v2-runner</span></div>
            </div>
          </div>

          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedAgentId(null)} className="w-full">
              Close Agent Inspector
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

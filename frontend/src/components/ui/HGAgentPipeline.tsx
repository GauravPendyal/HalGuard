'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Bot, ScanSearch, ShieldCheck, Database, Scale, Wrench, CheckCircle2, Loader2, Clock } from 'lucide-react';

export interface AgentStage {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'disabled';
  latencyMs?: number;
  message?: string;
}

interface HGAgentPipelineProps {
  stages?: AgentStage[];
  activeAgentId?: string;
  className?: string;
}

export function HGAgentPipeline({
  stages,
  activeAgentId,
  className,
}: HGAgentPipelineProps) {
  const defaultStages: AgentStage[] = [
    {
      id: 'llm',
      name: 'Base LLM Generator',
      role: 'OpenRouter Qwen 2.5',
      status: 'completed',
      latencyMs: 1160,
      message: 'Draft answer synthesized',
    },
    {
      id: 'detector',
      name: 'HaluEval Detector',
      role: 'Risk Scoring & Routing',
      status: 'completed',
      latencyMs: 240,
      message: 'Risk assessed: LOW (8%)',
    },
    {
      id: 'verifier',
      name: 'Ground Truth Verifier',
      role: '9-Stage Evidence Retrieval',
      status: 'completed',
      latencyMs: 820,
      message: 'Sources entailed',
    },
    {
      id: 'memory',
      name: 'Vector Memory Agent',
      role: 'Consensus Graph Store',
      status: 'completed',
      latencyMs: 15,
      message: 'Knowledge fact committed',
    },
    {
      id: 'judge',
      name: 'Consensus Judge',
      role: 'Bayesian Scoring (Retained)',
      status: 'disabled',
      message: 'Disabled in current profile',
    },
    {
      id: 'corrector',
      name: 'Diff Corrector',
      role: 'Patch Synthesis (Retained)',
      status: 'disabled',
      message: 'Disabled in current profile',
    },
  ];

  const agentList = stages || defaultStages;

  const getIcon = (id: string) => {
    switch (id) {
      case 'llm': return <Bot className="w-4 h-4" />;
      case 'detector': return <ScanSearch className="w-4 h-4" />;
      case 'verifier': return <ShieldCheck className="w-4 h-4" />;
      case 'memory': return <Database className="w-4 h-4" />;
      case 'judge': return <Scale className="w-4 h-4" />;
      case 'corrector': return <Wrench className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: AgentStage['status']) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono-code"><CheckCircle2 className="w-3 h-3" /> DONE</span>;
      case 'running':
        return <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 font-mono-code"><Loader2 className="w-3 h-3 animate-spin" /> ACTIVE</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-mono-code">FAIL</span>;
      case 'disabled':
        return <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono-code">RETAINED</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono-code">IDLE</span>;
    }
  };

  return (
    <div className={clsx('surface-beta rounded-2xl p-5', className)}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-xs font-mono-code uppercase tracking-wider text-slate-300">
            Multi-Agent Orchestration Topology
          </span>
        </div>
        <span className="text-[11px] font-mono-code text-slate-400">
          LangGraph Supervisor Engine v2.0
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agentList.map((agent) => {
          const isRunning = agent.status === 'running' || agent.id === activeAgentId;
          const isDisabled = agent.status === 'disabled';

          return (
            <div
              key={agent.id}
              className={clsx(
                'rounded-xl p-3.5 border transition-all duration-200 relative overflow-hidden',
                isDisabled
                  ? 'bg-[#05080E]/50 border-white/5 opacity-50'
                  : isRunning
                  ? 'bg-sky-950/20 border-sky-500/40 shadow-lg shadow-sky-500/10'
                  : 'surface-alpha border-white/5 hover:border-white/10'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={clsx(
                    'p-2 rounded-lg',
                    isDisabled ? 'bg-slate-800/40 text-slate-500' : isRunning ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800/60 text-slate-300'
                  )}>
                    {getIcon(agent.id)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{agent.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono-code">{agent.role}</p>
                  </div>
                </div>
                <div>{getStatusBadge(isRunning ? 'running' : agent.status)}</div>
              </div>

              {agent.message && (
                <div className="text-[11px] text-slate-300 font-mono-code bg-black/30 px-2.5 py-1 rounded-md mb-1.5 truncate">
                  {agent.message}
                </div>
              )}

              {agent.latencyMs !== undefined && (
                <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Execution</span>
                  <span className="text-slate-300">{agent.latencyMs}ms</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

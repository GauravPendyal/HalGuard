'use client';

import React from 'react';
import { clsx } from 'clsx';
import { ShieldCheck, AlertTriangle, XCircle, Activity } from 'lucide-react';

interface HGTrustIndicatorProps {
  score?: number;
  evidenceScore?: number;
  coverageScore?: number;
  consensusScore?: number;
  riskScore?: number;
  className?: string;
}

export function HGTrustIndicator({
  score = 92,
  evidenceScore = 94,
  coverageScore = 88,
  consensusScore = 91,
  riskScore = 8,
  className,
}: HGTrustIndicatorProps) {
  const getStatus = (val: number) => {
    if (val >= 80) return { label: 'TRUSTED', color: 'text-emerald-400', stroke: '#10B981', bg: 'from-emerald-500/10' };
    if (val >= 50) return { label: 'CAUTION', color: 'text-amber-400', stroke: '#F59E0B', bg: 'from-amber-500/10' };
    return { label: 'HIGH RISK', color: 'text-rose-400', stroke: '#EF4444', bg: 'from-rose-500/10' };
  };

  const status = getStatus(score);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={clsx('surface-beta rounded-2xl p-5 relative overflow-hidden', className)}>
      <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${status.bg} to-transparent rounded-full blur-2xl pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono-code uppercase tracking-wider text-slate-400">
          Trust Score Matrix
        </span>
        <span className={clsx('text-[11px] font-mono-code font-bold px-2 py-0.5 rounded-full border', status.color, 'border-current/30 bg-current/5')}>
          {status.label}
        </span>
      </div>

      {/* Primary Radial Gauge */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              className="stroke-slate-800/80"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke={status.stroke}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono-code text-white tracking-tight">{score}%</span>
            <span className="text-[9px] font-mono-code text-slate-500 uppercase">Consensus</span>
          </div>
        </div>

        {/* Overview Statement */}
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-200">
            {score >= 80 ? 'Ground Truth Confirmed' : score >= 50 ? 'Partial Verification' : 'Contradiction Detected'}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {score >= 80
              ? 'Multi-agent consensus confirms claim consistency against trusted sources.'
              : score >= 50
              ? 'Ambiguity detected across external knowledge bases. Caution advised.'
              : 'Direct contradiction identified in atomic factual claims.'}
          </p>
        </div>
      </div>

      {/* Multi-Dimensional Telemetry Breakdown */}
      <div className="space-y-2.5 pt-3 border-t border-white/5 font-mono-code text-xs">
        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Evidence Entailment</span>
            <span className="text-slate-200">{evidenceScore}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 rounded-full transition-all duration-700" style={{ width: `${evidenceScore}%` }} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Atomic Claim Coverage</span>
            <span className="text-slate-200">{coverageScore}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${coverageScore}%` }} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Source Consensus</span>
            <span className="text-slate-200">{consensusScore}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full transition-all duration-700" style={{ width: `${consensusScore}%` }} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Hallucination Risk</span>
            <span className="text-rose-400">{riskScore}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full transition-all duration-700" style={{ width: `${riskScore}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

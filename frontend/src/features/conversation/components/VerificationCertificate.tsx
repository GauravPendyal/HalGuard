'use client';

import * as React from 'react';
import { ShieldCheck, Download, FileJson, CheckCircle2, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface CertificateData {
  certificateId: string;
  overallConfidence: number;
  claimsCount: number;
  sourcesCount: number;
  totalExecutionTimeMs: number;
}

export function VerificationCertificate({ data }: { data: CertificateData }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-blue-500/30 p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Award className="w-24 h-24 text-blue-400" />
      </div>

      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100 tracking-tight">
              Cryptographic Verification Certificate
            </h4>
            <span className="text-[10px] font-mono text-zinc-400">ID: {data.certificateId}</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
        <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
          <span className="text-zinc-500 text-[10px] block">Trust Score</span>
          <span className="text-emerald-400 font-bold font-mono text-base">{data.overallConfidence}%</span>
        </div>
        <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
          <span className="text-zinc-500 text-[10px] block">Claims Audited</span>
          <span className="text-zinc-200 font-bold font-mono text-base">{data.claimsCount}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
          <span className="text-zinc-500 text-[10px] block">Ground Truth Sources</span>
          <span className="text-blue-400 font-bold font-mono text-base">{data.sourcesCount}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
          <span className="text-zinc-500 text-[10px] block">Execution Latency</span>
          <span className="text-purple-400 font-bold font-mono text-base flex items-center gap-1">
            <Clock className="w-3 h-3" /> {data.totalExecutionTimeMs}ms
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/60">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <FileJson className="w-3.5 h-3.5 text-amber-400" />
          <span>JSON Audit Payload</span>
        </Button>
        <Button variant="glow" size="sm" className="gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" />
          <span>Export PDF Certificate</span>
        </Button>
      </div>
    </div>
  );
}

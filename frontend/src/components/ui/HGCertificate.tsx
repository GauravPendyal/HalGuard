'use client';

import React, { useState } from 'react';
import { ShieldCheck, Download, FileJson, Check, ExternalLink, Award } from 'lucide-react';
import { HGButton } from './HGButton';

interface HGCertificateProps {
  certificateId?: string;
  trustScore?: number;
  claimsCount?: number;
  sourcesCount?: number;
  latencyMs?: number;
  finalAnswer?: string;
  className?: string;
}

export function HGCertificate({
  certificateId = 'HG-CERT-849102',
  trustScore = 92,
  claimsCount = 3,
  sourcesCount = 8,
  latencyMs = 1840,
  finalAnswer,
  className,
}: HGCertificateProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleExportJSON = () => {
    const payload = {
      certificateId,
      trustScore,
      claimsCount,
      sourcesCount,
      latencyMs,
      timestamp: new Date().toISOString(),
      engine: 'HalluciGuard LangGraph Production Supervisor v2.0',
      finalAnswer,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${certificateId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    setDownloaded(true);
    setTimeout(() => {
      window.print();
      setDownloaded(false);
    }, 300);
  };

  return (
    <div className={`surface-beta rounded-2xl p-6 border border-emerald-500/30 relative overflow-hidden ${className || ''}`}>
      <div className="absolute -right-16 -top-16 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Certificate Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Cryptographic Verification Certificate
              </h3>
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                OFFICIALLY ATTESTED
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              ATTESTATION ID: <span className="text-sky-400 font-semibold">{certificateId}</span>
            </p>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2">
          <HGButton variant="secondary" size="sm" icon={<FileJson className="w-3.5 h-3.5" />} onClick={handleExportJSON}>
            JSON Audit
          </HGButton>
          <HGButton variant="verified" size="sm" icon={downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />} onClick={handleExportPDF}>
            {downloaded ? 'Preparing...' : 'Export Certificate'}
          </HGButton>
        </div>
      </div>

      {/* Certificate Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="surface-alpha rounded-xl p-3.5 border border-white/5">
          <div className="text-[10px] font-mono-code uppercase text-slate-400">Consensus Trust</div>
          <div className="text-xl font-bold font-mono-code text-emerald-400 mt-1">{trustScore}%</div>
        </div>
        <div className="surface-alpha rounded-xl p-3.5 border border-white/5">
          <div className="text-[10px] font-mono-code uppercase text-slate-400">Audited Claims</div>
          <div className="text-xl font-bold font-mono-code text-sky-400 mt-1">{claimsCount}</div>
        </div>
        <div className="surface-alpha rounded-xl p-3.5 border border-white/5">
          <div className="text-[10px] font-mono-code uppercase text-slate-400">Ground Truth Sources</div>
          <div className="text-xl font-bold font-mono-code text-indigo-400 mt-1">{sourcesCount}</div>
        </div>
        <div className="surface-alpha rounded-xl p-3.5 border border-white/5">
          <div className="text-[10px] font-mono-code uppercase text-slate-400">Total Latency</div>
          <div className="text-xl font-bold font-mono-code text-slate-200 mt-1">{latencyMs}ms</div>
        </div>
      </div>

      {/* Verified Statement Display */}
      {finalAnswer && (
        <div className="surface-alpha rounded-xl p-4 border border-white/5 mb-4">
          <div className="text-[10px] font-mono-code uppercase text-slate-400 mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Grounded Factual Output</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {finalAnswer}
          </p>
        </div>
      )}

      {/* Footer Attestation */}
      <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-500 pt-3 border-t border-white/5">
        <span>Verified by HalluciGuard Engine | Zero-Trust AI Standard</span>
        <span>SHA-256 Provenance Ledger Root</span>
      </div>
    </div>
  );
}

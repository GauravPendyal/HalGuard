'use client';

import React from 'react';
import { clsx } from 'clsx';
import { VerificationClaim } from '@/types';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Layers } from 'lucide-react';

interface HGClaimMatrixProps {
  claims?: VerificationClaim[];
  onSelectClaim?: (claim: VerificationClaim) => void;
  selectedClaimId?: string;
  className?: string;
}

export function HGClaimMatrix({
  claims = [],
  onSelectClaim,
  selectedClaimId,
  className,
}: HGClaimMatrixProps) {
  const defaultClaims: VerificationClaim[] = [
    {
      id: 'claim-1',
      claimText: 'Paris serves as the primary capital and constitutional seat of the French Republic.',
      status: 'verified',
      confidence: 99,
      evidenceUrl: 'https://en.wikipedia.org/wiki/Paris',
      evidenceSnippet: 'Official municipal and national archives confirm Paris as capital.',
    },
    {
      id: 'claim-2',
      claimText: 'Historical GDP per capita exceeds €65,000 across metropolitan districts.',
      status: 'verified',
      confidence: 94,
      evidenceUrl: 'https://insee.fr/fr/statistiques',
      evidenceSnippet: 'INSEE economic survey data corroborates per capita production estimates.',
    },
  ];

  const items = claims.length > 0 ? claims : defaultClaims;

  const getStatusIcon = (status: VerificationClaim['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'corrected':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-sky-400" />;
    }
  };

  const getStatusBadge = (status: VerificationClaim['status']) => {
    switch (status) {
      case 'verified':
        return <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">VERIFIED</span>;
      case 'corrected':
        return <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">CAUTION</span>;
      case 'rejected':
        return <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">CONTRADICTED</span>;
      default:
        return <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">AUDITING</span>;
    }
  };

  return (
    <div className={clsx('surface-beta rounded-2xl p-5', className)}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-mono-code uppercase tracking-wider text-slate-200">
            Decomposed Atomic Claims Matrix ({items.length})
          </h3>
        </div>
        <span className="text-[11px] font-mono-code text-slate-400">
          Claim Granularity: Atomic Factual
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((claim, idx) => {
          const isSelected = claim.id === selectedClaimId;
          return (
            <div
              key={claim.id || idx}
              onClick={() => onSelectClaim?.(claim)}
              className={clsx(
                'rounded-xl p-4 border transition-all duration-150 cursor-pointer flex flex-col gap-2',
                isSelected
                  ? 'bg-sky-950/30 border-sky-400/50 shadow-md shadow-sky-500/10'
                  : 'surface-alpha border-white/5 hover:border-white/20 hover:bg-[#0A101A]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0">{getStatusIcon(claim.status)}</span>
                  <span className="text-xs font-medium text-slate-200 leading-relaxed">
                    {claim.claimText}
                  </span>
                </div>
                <div className="shrink-0">{getStatusBadge(claim.status)}</div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 pt-2 border-t border-white/5">
                <span className="text-slate-400 truncate max-w-[260px]">
                  {claim.evidenceSnippet || 'Cross-referenced against verified ground truth.'}
                </span>
                <span className="text-slate-200 font-semibold shrink-0">
                  {claim.confidence}% Grounded
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { VerificationClaim } from '@/types';

export function ClaimChip({ claim }: { claim: VerificationClaim }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const statusStyles = {
    verified: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:border-emerald-400',
    corrected: 'bg-amber-950/80 text-amber-400 border-amber-500/40 hover:border-amber-400',
    rejected: 'bg-red-950/80 text-red-400 border-red-500/40 hover:border-red-400',
  };

  const statusIcons = {
    verified: <CheckCircle className="w-3 h-3 text-emerald-400" />,
    corrected: <AlertCircle className="w-3 h-3 text-amber-400" />,
    rejected: <AlertCircle className="w-3 h-3 text-red-400" />,
  };

  return (
    <div className="relative inline-block m-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium backdrop-blur-md transition-all shadow-sm ${
          statusStyles[claim.status]
        }`}
      >
        {statusIcons[claim.status]}
        <span>{claim.claimText}</span>
        <span className="font-mono text-[10px] opacity-80">{claim.confidence}%</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 p-3 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl backdrop-blur-xl text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
            <span className="font-semibold text-zinc-200 capitalize">{claim.status} Claim</span>
            <span className="font-mono text-emerald-400 font-bold">{claim.confidence}% Verified</span>
          </div>
          {claim.evidenceSnippet && (
            <p className="text-[11px] text-zinc-400 italic bg-zinc-950 p-2 rounded border border-zinc-800/60">
              &quot;{claim.evidenceSnippet}&quot;
            </p>
          )}
          {claim.evidenceUrl && (
            <a
              href={claim.evidenceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-blue-400 hover:underline block truncate"
            >
              Source: {claim.evidenceUrl}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

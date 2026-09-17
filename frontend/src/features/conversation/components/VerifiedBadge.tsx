'use client';

import * as React from 'react';
import { ShieldCheck, Clock } from 'lucide-react';

export function VerifiedBadge({
  confidence = 98.4,
  latencyMs = 340,
}: {
  confidence?: number;
  latencyMs?: number;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 text-xs font-semibold backdrop-blur-md shadow-md">
      <ShieldCheck className="w-4 h-4 text-emerald-400" />
      <span>Verified Answer ({confidence}%)</span>
      <span className="h-3 w-px bg-emerald-800" />
      <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-300">
        <Clock className="w-3 h-3" /> {latencyMs}ms
      </span>
    </div>
  );
}

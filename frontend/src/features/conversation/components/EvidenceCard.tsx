'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { FileCheck, ExternalLink, Zap, ShieldCheck } from 'lucide-react';

export interface EvidenceItem {
  source: string;
  trustScore: number;
  relevance: number;
  snippet: string;
  latencyMs: number;
  url: string;
}

export function EvidenceCard({ item, index }: { item: EvidenceItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700 backdrop-blur-md transition-all shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
            <FileCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">{item.source}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-emerald-400 border border-emerald-800/50">
            Official Source
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3 h-3" /> {item.trustScore}% Trust
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <Zap className="w-3 h-3" /> {item.latencyMs}ms
          </span>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 mt-2 italic bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/60 leading-relaxed">
        &quot;{item.snippet}&quot;
      </p>

      <div className="flex justify-end mt-2">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 hover:underline"
        >
          <span>Inspect Reference</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </motion.div>
  );
}

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { GitCompare, PlusCircle, MinusCircle } from 'lucide-react';

export interface DiffChunk {
  type: 'add' | 'delete' | 'equal';
  value: string;
}

export function DiffViewer({ diffs }: { diffs: DiffChunk[] }) {
  return (
    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs overflow-x-auto space-y-2">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2 mb-2">
        <GitCompare className="w-4 h-4 text-purple-400" />
        <span className="font-sans font-semibold text-zinc-200">Refiner Agent Hallucination Patch</span>
        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800">
          Git-Style Patch
        </span>
      </div>

      <div className="space-y-1">
        {diffs.map((chunk, idx) => {
          if (chunk.type === 'delete') {
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 bg-red-950/40 border-l-2 border-red-500 text-red-300 p-1.5 rounded-r"
              >
                <MinusCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span className="line-through">{chunk.value}</span>
              </motion.div>
            );
          }
          if (chunk.type === 'add') {
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 bg-emerald-950/40 border-l-2 border-emerald-500 text-emerald-300 p-1.5 rounded-r"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{chunk.value}</span>
              </motion.div>
            );
          }
          return (
            <div key={idx} className="text-zinc-400 p-1">
              {chunk.value}
            </div>
          );
        })}
      </div>
    </div>
  );
}

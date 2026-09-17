'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';

export function ConsensusMeter({ confidence }: { confidence: number }) {
  const [history, setHistory] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (confidence > 0) {
      setHistory((prev) => {
        if (prev[prev.length - 1] === confidence) return prev;
        return [...prev, confidence];
      });
    }
  }, [confidence]);

  return (
    <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-zinc-200">Arbiter Bayesian Consensus Score</span>
        </div>
        <motion.span
          key={confidence}
          initial={{ scale: 1.2, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-1"
        >
          <ShieldCheck className="w-4 h-4" /> {confidence}%
        </motion.span>
      </div>

      <Progress value={confidence} variant="green" size="md" />

      {/* Confidence Evolution History Stepper */}
      {history.length > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 font-mono text-[10px]">
          <span className="text-zinc-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            <span>Truth Evolution:</span>
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {history.map((val, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-zinc-600">→</span>}
                <span
                  className={`px-1.5 py-0.5 rounded border ${
                    idx === history.length - 1
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800 font-bold'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {val}%
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

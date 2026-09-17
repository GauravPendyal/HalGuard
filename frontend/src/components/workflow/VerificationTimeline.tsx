'use client';

import * as React from 'react';
import { eventBus } from '@/engine';
import { Clock, CheckCircle2, Circle } from 'lucide-react';

export function VerificationTimeline() {
  const [steps, setSteps] = React.useState<
    { title: string; desc: string; completed: boolean; active: boolean }[]
  >([
    { title: 'Prompt Received', desc: 'User query registered', completed: false, active: false },
    { title: 'Draft Generation', desc: 'Reasoner LLM candidate output', completed: false, active: false },
    { title: 'Claims Extracted', desc: 'Investigator entity parsing', completed: false, active: false },
    { title: 'Evidence Discovered', desc: 'Archivist ground truth lookup', completed: false, active: false },
    { title: 'Arbiter Consensus', desc: 'Bayesian confidence scoring', completed: false, active: false },
    { title: 'Refiner Diff Patch', desc: 'Hallucination text rewrite', completed: false, active: false },
    { title: 'Memory Sync', desc: 'Vector consensus index updated', completed: false, active: false },
    { title: 'Verification Certificate', desc: 'Cryptographic proof payload', completed: false, active: false },
  ]);

  React.useEffect(() => {
    const updateStep = (index: number) => {
      setSteps((prev) =>
        prev.map((s, idx) => {
          if (idx < index) return { ...s, completed: true, active: false };
          if (idx === index) return { ...s, completed: false, active: true };
          return s;
        })
      );
    };

    const u1 = eventBus.on('PROMPT_SUBMITTED', () => updateStep(0));
    const u2 = eventBus.on('LLM_DRAFT_STARTED', () => updateStep(1));
    const u3 = eventBus.on('CLAIMS_EXTRACTED', () => updateStep(2));
    const u4 = eventBus.on('EVIDENCE_DISCOVERED', () => updateStep(3));
    const u5 = eventBus.on('CONSENSUS_UPDATED', () => updateStep(4));
    const u6 = eventBus.on('CORRECTION_STARTED', () => updateStep(5));
    const u7 = eventBus.on('MEMORY_UPDATED', () => updateStep(6));
    const u8 = eventBus.on('VERIFICATION_COMPLETED', () => {
      setSteps((prev) => prev.map((s) => ({ ...s, completed: true, active: false })));
    });

    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
      u8();
    };
  }, []);

  return (
    <div className="p-4 space-y-4 text-xs select-none">
      <div className="flex items-center gap-2 text-zinc-400 border-b border-zinc-800 pb-2">
        <Clock className="w-4 h-4 text-blue-400" />
        <span className="font-semibold text-zinc-200">Execution Timeline</span>
      </div>

      <div className="relative pl-4 space-y-4 border-l border-zinc-800">
        {steps.map((step, idx) => (
          <div key={idx} className="relative flex items-start gap-3">
            <div className="absolute -left-[21px] top-0.5 bg-zinc-950 p-0.5">
              {step.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : step.active ? (
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500" />
                </span>
              ) : (
                <Circle className="w-4 h-4 text-zinc-700" />
              )}
            </div>

            <div className="flex flex-col">
              <span
                className={`font-semibold ${
                  step.completed
                    ? 'text-emerald-400'
                    : step.active
                    ? 'text-blue-400 font-bold'
                    : 'text-zinc-500'
                }`}
              >
                {step.title}
              </span>
              <span className="text-[10px] text-zinc-500">{step.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

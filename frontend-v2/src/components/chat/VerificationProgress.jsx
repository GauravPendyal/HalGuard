"use client";

import { useEffect, useState } from "react";

export const STAGES = ["Analyzing claim", "Tracing evidence", "Comparing sources", "Checking consistency"];

export function VerificationProgress({ stage }) {
  const [visible, setVisible] = useState(stage);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (stage === visible) return undefined;
    setFading(true);
    const t = setTimeout(() => { setVisible(stage); setFading(false); }, 180);
    return () => clearTimeout(t);
  }, [stage, visible]);

  return (
    <div className="animate-hg-rise" data-testid="verification-progress" role="status" aria-live="polite">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-hg-muted">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hg-accent opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-hg-accent" /></span>
        HalluciGuard
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[15px] text-hg-text2 transition-opacity duration-[180ms] ${fading ? "opacity-0" : "opacity-100"}`} data-testid="progress-stage">{STAGES[visible]}</span>
        <span className="font-mono text-[11px] text-hg-muted">{visible + 1}/{STAGES.length}</span>
      </div>
      <div className="mt-3 h-px w-56 overflow-hidden rounded-full bg-hg-sunken">
        <div className="h-full w-1/2 rounded-full bg-hg-accent motion-safe:animate-hg-line motion-reduce:w-full" />
      </div>
      <ol className="mt-4 hidden gap-4 text-[11.5px] sm:flex" aria-hidden="true">
        {STAGES.map((s, i) => (
          <li key={s} className={`flex items-center gap-1.5 transition-colors duration-300 ${i <= visible ? "text-hg-text2" : "text-hg-muted/60"}`}>
            <span className={`h-1 w-1 rounded-full ${i <= visible ? "bg-hg-accent" : "bg-hg-muted/40"}`} />{s}
          </li>
        ))}
      </ol>
    </div>
  );
}

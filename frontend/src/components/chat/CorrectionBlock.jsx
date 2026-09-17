"use client";

import { ArrowDown, CheckCircle2 } from "lucide-react";

export function CorrectionBlock({ original, correction }) {
  return (
    <div className="mt-5 rounded-[14px] border border-hg-line bg-hg-surface/60 p-4 animate-hg-rise" data-testid="correction-block">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-hg-muted">Original claim</div>
      <p className="mt-1 text-[14px] leading-relaxed text-hg-text2 line-through decoration-[var(--contradicted)] decoration-1">“{original}”</p>
      <div className="my-3 flex items-center gap-2 text-hg-muted"><ArrowDown className="h-3.5 w-3.5" /><span className="h-px flex-1 bg-[var(--border)]" /></div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-hg-accent">HalluciGuard correction</div>
      <p className="mt-1 text-[15px] leading-relaxed text-hg-text">“{correction}”</p>
      <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-hg-supported"><CheckCircle2 className="h-3.5 w-3.5" /> Verified against retrieved evidence.</div>
    </div>
  );
}

"use client";

import { VERDICTS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatusPill({ verdict = "uncertain", label, className, dot = true, testId }) {
  const meta = VERDICTS[verdict] || VERDICTS.uncertain;
  return (
    <span
      data-testid={testId}
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-medium tracking-[0.01em]", className)}
      style={{ color: meta.color, background: meta.tint }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />}
      {label || meta.label}
    </span>
  );
}

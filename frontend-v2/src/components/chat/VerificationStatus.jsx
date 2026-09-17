"use client";

import { VERDICTS } from "@/lib/format";

export function VerificationStatus({ verdict, explanation }) {
  const meta = VERDICTS[verdict] || VERDICTS.uncertain;
  return (
    <div
      className="mt-4 inline-flex max-w-full items-start gap-3 rounded-[14px] border px-4 py-3 animate-hg-rise"
      style={{ background: meta.tint, borderColor: `color-mix(in srgb, ${meta.color} 22%, transparent)` }}
      data-testid="verification-status"
      data-verdict={verdict}
    >
      <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color, boxShadow: `0 0 0 4px color-mix(in srgb, ${meta.color} 18%, transparent)` }} />
      <div className="min-w-0">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: meta.color }}>{meta.label}</div>
        <div className="mt-0.5 text-[13.5px] text-hg-text2">{explanation}</div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useState } from "react";
import { ChevronDown, FileText, Layers, ShieldCheck } from "lucide-react";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { SourceExplorer } from "@/components/results/SourceExplorer";
import { verdictMeta } from "@/lib/verdict";
import { cn } from "@/lib/utils/cn";
import { count as fmtCount } from "@/lib/utils/format";
import type { ClaimVM } from "@/lib/api/types";

function CountChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-dim">
      <Icon className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
      <span className="tnum font-mono text-ink-muted">{value == null ? "—" : fmtCount(value)}</span>
      {label}
    </span>
  );
}

export function ClaimCard({ claim, index, defaultOpen }: { claim: ClaimVM; index: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const meta = verdictMeta(claim.verdict);
  const Icon = meta.Icon;
  const panelId = `claim-panel-${claim.id}`;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line border-l-2 bg-panel", meta.accentClass)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-panel-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
      >
        <span className="mt-0.5 flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-faint tnum">
            {String(index + 1).padStart(2, "0")}
          </span>
          <Icon className={cn("h-4 w-4", meta.textClass)} aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-sm border px-1.5 py-px font-mono text-[10px] uppercase tracking-wider", meta.chipClass)}>
              {meta.label}
            </span>
          </span>
          <span className="mt-1.5 block text-[15px] leading-snug text-ink">
            {claim.text ?? "Untitled claim"}
          </span>
        </span>

        <ChevronDown
          className={cn("mt-1 h-4 w-4 shrink-0 text-ink-dim transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="border-t border-line px-4 py-4 [animation:hg-rise_0.15s_ease]">
          {/* Scores */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <ScoreDisplay label="Support" value={claim.scores.support} tone="support" />
            <ScoreDisplay label="Contradiction" value={claim.scores.contradiction} tone="refute" />
            <ScoreDisplay label="Trust" value={claim.scores.trust} tone="trust" />
            <ScoreDisplay label="Confidence" value={claim.scores.confidence} tone="neutral" />
          </div>

          {/* Explanation */}
          {claim.explanation && (
            <div className="mt-4 rounded-md border border-line bg-panel-inset p-3">
              <div className="hg-eyebrow mb-1.5">Why this verdict</div>
              <p className="text-[13.5px] leading-relaxed text-ink-muted">{claim.explanation}</p>
            </div>
          )}

          {/* Counts */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <CountChip icon={FileText} label="retrieved" value={claim.counts.retrieved} />
            <CountChip icon={Layers} label="reranked" value={claim.counts.reranked} />
            <CountChip icon={ShieldCheck} label="in decision set" value={claim.counts.verified} />
          </div>

          {/* Evidence */}
          <div className="mt-4 border-t border-line-faint pt-4">
            <div className="hg-eyebrow mb-2.5">Evidence</div>
            <SourceExplorer evidence={claim.evidence} />
          </div>
        </div>
      )}
    </div>
  );
}

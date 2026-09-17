"use client";

import * as React from "react";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Tabs } from "@/components/ui/Tabs";
import { Meter } from "@/components/ui/ScoreDisplay";
import { verdictMeta } from "@/lib/verdict";
import { percent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Verdict } from "@/lib/api/types";

/**
 * Signature interaction: a tactile "reading" instrument that lets a first-time
 * visitor feel the core thesis — four honest verdicts, evidence-first, and
 * missing values shown as missing. Every number here is an explicit ILLUSTRATION
 * (not a live verification), and the panel says so plainly.
 */

interface Sample {
  claim: string;
  confidence: number | null;
  supporting: number;
  contradicting: number;
}

const SAMPLES: Record<Verdict, Sample> = {
  verified: {
    claim: "Water boils at 100 °C at standard sea-level pressure.",
    confidence: 0.94,
    supporting: 4,
    contradicting: 0,
  },
  contradicted: {
    claim: "The Great Wall of China is visible from the Moon with the naked eye.",
    confidence: 0.91,
    supporting: 0,
    contradicting: 5,
  },
  conflicted: {
    claim: "Moderate coffee consumption reduces long-term mortality.",
    confidence: 0.52,
    supporting: 3,
    contradicting: 2,
  },
  unverified: {
    claim: "A private company will place a crew in Mars orbit before 2028.",
    confidence: null,
    supporting: 0,
    contradicting: 0,
  },
};

const ORDER: Verdict[] = ["verified", "contradicted", "conflicted", "unverified"];

export function VerdictInstrument() {
  const [verdict, setVerdict] = useState<Verdict>("verified");
  const meta = verdictMeta(verdict);
  const sample = SAMPLES[verdict];
  const Icon = meta.Icon;

  const meterTone =
    verdict === "verified"
      ? "support"
      : verdict === "contradicted"
        ? "refute"
        : verdict === "conflicted"
          ? "trust"
          : "neutral";

  return (
    <div className={cn("rounded-xl border border-line-strong bg-panel", "border-l-2", meta.accentClass)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="hg-eyebrow">Verdict reading</span>
        <span className="rounded-sm border border-line-strong bg-panel-inset px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-dim">
          Illustration
        </span>
      </div>

      {/* Verdict selector */}
      <div className="border-b border-line-faint px-4 py-3">
        <Tabs
          ariaLabel="Sample verdict"
          value={verdict}
          onValueChange={(v) => setVerdict(v as Verdict)}
          items={ORDER.map((v) => ({ value: v, label: verdictMeta(v).label }))}
          className="flex-wrap"
        />
      </div>

      {/* Reading — announced on change */}
      <div key={verdict} className="px-4 py-4 [animation:hg-rise_0.2s_ease]" aria-live="polite">
        <p className="text-[11px] uppercase tracking-wider text-ink-faint">Sample claim</p>
        <p className="mt-1 text-[15px] leading-snug text-ink">{sample.claim}</p>

        <div className="mt-4 flex items-center gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border", meta.chipClass)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className={cn("font-display text-[19px] font-semibold leading-tight", meta.textClass)}>
              {meta.label}
            </div>
            <p className="text-[12.5px] leading-snug text-ink-muted">{meta.blurb}</p>
          </div>
        </div>

        {/* Confidence — demonstrates "missing stays missing" on the unverified case */}
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-ink-muted">Evidence confidence</span>
            <span className="tnum font-mono text-[13px] font-medium text-ink">
              {sample.confidence == null ? "—" : percent(sample.confidence)}
            </span>
          </div>
          <Meter value={sample.confidence} tone={meterTone} aria-label="Sample evidence confidence" />
          {sample.confidence == null && (
            <p className="text-[11.5px] leading-snug text-ink-dim">
              No decision-grade evidence was found — so no confidence is shown. HalluciGuard leaves
              it blank rather than inventing a number.
            </p>
          )}
        </div>

        {/* Evidence tally */}
        <div className="mt-4 flex items-center gap-4 border-t border-line-faint pt-3 text-[12.5px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-verified" aria-hidden="true" />
            <span className="tnum font-mono text-ink">{sample.supporting}</span>
            <span className="text-ink-muted">supporting</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-contradicted" aria-hidden="true" />
            <span className="tnum font-mono text-ink">{sample.contradicting}</span>
            <span className="text-ink-muted">contradicting</span>
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="text-[11.5px] leading-snug text-ink-dim">
          An illustration of how each verdict is reported — not a live result.
        </p>
        <Link
          href="/app"
          className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-signal-bright hover:text-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          Run a real one
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

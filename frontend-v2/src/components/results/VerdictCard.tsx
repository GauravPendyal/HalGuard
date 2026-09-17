"use client";

import * as React from "react";
import { useState } from "react";
import { MessageSquareText, ChevronDown, Cpu, Gauge } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Meter } from "@/components/ui/ScoreDisplay";
import { verdictMeta } from "@/lib/verdict";
import { percent, duration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { VerificationResult, Verdict } from "@/lib/api/types";

const VERDICT_ORDER: Verdict[] = ["verified", "contradicted", "conflicted", "unverified"];

function ClaimDistribution({ result }: { result: VerificationResult }) {
  const dist = VERDICT_ORDER.map((v) => ({
    verdict: v,
    n: result.claims.filter((c) => c.verdict === v).length,
  })).filter((d) => d.n > 0);

  const unresolved = result.claims.filter((c) => c.verdict === null).length;
  if (dist.length === 0 && unresolved === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {dist.map((d) => {
        const m = verdictMeta(d.verdict);
        return (
          <span key={d.verdict} className="inline-flex items-center gap-1.5 text-[12.5px]">
            <span className="h-2 w-2 rounded-full" aria-hidden="true" style={{ backgroundColor: `var(--color-${d.verdict})` }} />
            <span className="tnum font-mono text-ink">{d.n}</span>
            <span className="text-ink-muted">{m.label.toLowerCase()}</span>
          </span>
        );
      })}
      {unresolved > 0 && (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-dim">
          <span className="tnum font-mono">{unresolved}</span> without verdict
        </span>
      )}
    </div>
  );
}

export function VerdictCard({ result }: { result: VerificationResult }) {
  const [showDraft, setShowDraft] = useState(false);

  const overall = verdictMeta(result.overallVerdict);
  const OverallIcon = overall.Icon;
  const statusLabel = result.overallVerdict
    ? overall.label
    : (result.verificationStatus ?? "Unverified").replace(/_/g, " ");

  const draftDiffers =
    result.answer.draft != null &&
    result.answer.final != null &&
    result.answer.draft.trim() !== result.answer.final.trim();

  const answerText = result.answer.final ?? result.answer.draft;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* ---------------- VERIFICATION (the instrument's reading) ---------------- */}
      <Panel className={cn("lg:col-span-5", overall.accentClass)}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="hg-eyebrow">Verification</span>
          {result.totalLatencyMs != null && (
            <span className="tnum font-mono text-[11px] text-ink-dim">{duration(result.totalLatencyMs)}</span>
          )}
        </div>
        <div className="flex flex-col gap-4 px-4 py-4">
          {/* Overall status */}
          <div className="flex items-center gap-3">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", overall.chipClass)}>
              <OverallIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className={cn("text-[17px] font-display font-medium capitalize leading-tight", overall.textClass)}>
                {statusLabel}
              </div>
              <p className="text-[12.5px] leading-snug text-ink-muted">{overall.blurb}</p>
            </div>
          </div>

          {/* Overall evidence confidence */}
          {result.overallConfidence != null && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
                  <Gauge className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
                  Overall evidence confidence
                </span>
                <span className="tnum font-mono text-[13px] font-medium text-ink">
                  {percent(result.overallConfidence)}
                </span>
              </div>
              <Meter value={result.overallConfidence} tone="signal" aria-label="Overall evidence confidence" />
            </div>
          )}

          {/* Claim distribution */}
          {result.claims.length > 0 && (
            <div className="border-t border-line-faint pt-3">
              <div className="hg-eyebrow mb-2">
                {result.claims.length} claim{result.claims.length === 1 ? "" : "s"}
              </div>
              <ClaimDistribution result={result} />
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

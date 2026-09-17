"use client";

import * as React from "react";
import { useState } from "react";
import { Check, X, Minus, Ban, ChevronDown, Quote } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/ScoreDisplay";
import { NLIResult } from "@/components/results/NLIResult";
import { SourceBadge } from "@/components/results/SourceBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import { shortDate, percent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { EvidenceVM, EvidenceRelation } from "@/lib/api/types";

const RELATION_META: Record<
  EvidenceRelation,
  { label: string; tone: "verified" | "contradicted" | "unverified" | "neutral"; Icon: React.ElementType }
> = {
  supporting: { label: "Supports", tone: "verified", Icon: Check },
  contradicting: { label: "Contradicts", tone: "contradicted", Icon: X },
  neutral: { label: "Neutral", tone: "unverified", Icon: Minus },
  irrelevant: { label: "Irrelevant", tone: "neutral", Icon: Ban },
};

export function EvidenceCard({ evidence }: { evidence: EvidenceVM }) {
  const [open, setOpen] = useState(false);
  const rel = evidence.relation ? RELATION_META[evidence.relation] : null;
  const RelIcon = rel?.Icon;

  const hasModelData =
    evidence.bgeScore != null ||
    evidence.nli.entailment != null ||
    evidence.nli.contradiction != null ||
    evidence.nli.neutral != null;

  return (
    <div className="rounded-lg border border-line bg-panel-raised">
      <div className="flex flex-col gap-2.5 p-3.5">
        {/* Header: relation + title + decision-grade */}
        <div className="flex flex-wrap items-center gap-2">
          {rel ? (
            <Badge tone={rel.tone} size="sm" className="gap-1">
              {RelIcon && <RelIcon className="h-3 w-3" aria-hidden="true" />}
              {rel.label}
            </Badge>
          ) : (
            <Badge tone="neutral" size="sm">
              Unclassified
            </Badge>
          )}

          {evidence.inDecisionGrade === true && (
            <Tooltip content="This passage met the relevance and credibility thresholds to influence the verdict.">
              <Badge tone="signal" size="sm">
                Decision-grade
              </Badge>
            </Tooltip>
          )}
          {evidence.inDecisionGrade === false && (
            <Tooltip content="Retrieved and analyzed, but below threshold — it did not influence the verdict.">
              <span className="text-[11px] text-ink-faint">excluded from decision</span>
            </Tooltip>
          )}
        </div>

        {/* Title */}
        {evidence.title && (
          <h4 className="text-[14px] font-medium leading-snug text-ink">{evidence.title}</h4>
        )}

        {/* Snippet */}
        {evidence.snippet && (
          <blockquote className="flex gap-2 border-l-2 border-line-strong pl-3 text-[13px] leading-relaxed text-ink-muted">
            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
            <span>{evidence.snippet}</span>
          </blockquote>
        )}

        {/* Provenance row */}
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={evidence.source} url={evidence.url} credibility={evidence.credibility} />
          {evidence.publicationDate && (
            <span className="text-[11px] text-ink-faint">{shortDate(evidence.publicationDate)}</span>
          )}
          {evidence.bgeScore != null && (
            <span className="tnum ml-auto font-mono text-[11px] text-ink-dim">
              relevance {percent(evidence.bgeScore, 0)}
            </span>
          )}
        </div>
      </div>

      {/* Model analysis disclosure */}
      {hasModelData && (
        <div className="border-t border-line-faint">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between px-3.5 py-2 text-[12px] text-ink-dim hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-signal"
          >
            <span className="inline-flex items-center gap-1.5">
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
              Model analysis
            </span>
            <span className="font-mono text-[11px] text-ink-faint">BGE · DeBERTa</span>
          </button>
          {open && (
            <div className="flex flex-col gap-3.5 border-t border-line-faint bg-panel-inset px-3.5 py-3.5 [animation:hg-rise_0.15s_ease]">
              {evidence.bgeScore != null && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] text-ink-muted">
                      BGE reranker relevance
                    </span>
                    <span className="tnum font-mono text-[12px] text-ink">
                      {percent(evidence.bgeScore)}
                    </span>
                  </div>
                  <Meter value={evidence.bgeScore} tone="signal" aria-label="BGE reranker relevance" />
                </div>
              )}
              <NLIResult
                entailment={evidence.nli.entailment}
                contradiction={evidence.nli.contradiction}
                neutral={evidence.nli.neutral}
                label={evidence.entailmentLabel}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

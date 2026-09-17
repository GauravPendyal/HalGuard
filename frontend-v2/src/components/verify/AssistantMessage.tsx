"use client";

import * as React from "react";
import { useState } from "react";
import { ShieldCheck, ChevronRight, Activity, ExternalLink } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import type { VerifyPhase } from "@/lib/hooks/useVerification";
import type { VerificationResult, EvidenceVM } from "@/lib/api/types";
import { decodeHtmlEntities } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function getVerdictColor(verdict?: string | null) {
  if (!verdict) return "text-text-muted bg-surface-tertiary border-border";
  switch (verdict.toLowerCase()) {
    case "verified":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "contradicted":
      return "text-rose-400 bg-rose-500/10 border-rose-500/30";
    case "conflicted":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    default:
      return "text-text-muted bg-surface-tertiary border-border";
  }
}

function getVerdictDescription(verdict?: string | null): string {
  if (!verdict) return "No definitive conclusion reached.";
  switch (verdict.toLowerCase()) {
    case "verified":
      return "Authoritative sources confirm this claim is factually accurate.";
    case "contradicted":
      return "Available evidence contradicts and disproves this claim.";
    case "conflicted":
      return "Sources contain conflicting claims on this topic.";
    case "unverified":
      return "Insufficient authoritative evidence found to verify this statement.";
    default:
      return "Verification completed.";
  }
}

export function AssistantMessage({
  phase,
  elapsedMs,
  result,
}: {
  phase: VerifyPhase;
  elapsedMs: number;
  result: VerificationResult | null;
}) {
  const isComplete = phase === "complete" && result !== null;
  const isRunning = phase === "running";

  const rawAnswer = result?.answer?.final ?? result?.answer?.draft;
  const answerText = decodeHtmlEntities(rawAnswer);

  return (
    <div className="flex w-full gap-4">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-tertiary border border-border">
        <LogoMark className="h-4 w-4 text-signal" />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="text-[15px] font-semibold text-text-primary">HalluciGuard</span>

        {/* Loading state - rendered only while running */}
        {isRunning && (
          <div className="flex items-center gap-2 text-[15px] text-text-muted py-1">
            <Activity className="h-4 w-4 animate-pulse text-signal" />
            <span>Verifying this claim against available evidence...</span>
            <span className="text-xs text-text-muted font-mono">({(elapsedMs / 1000).toFixed(1)}s)</span>
          </div>
        )}

        {/* Completed state */}
        {isComplete && (
          <div className="flex flex-col gap-4">
            {/* The model answer / explanation */}
            {answerText && (
              <div className="text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap">
                {answerText}
              </div>
            )}

            {/* Verdict and Evidence details if claims were verified */}
            {!result.verifierSkipped && result.claims && result.claims.length > 0 && (
              <div className="mt-1 flex flex-col gap-4">
                {result.claims.map((claim) => {
                  const claimVerdict = claim.verdict || result.overallVerdict || "UNVERIFIED";
                  return (
                    <div key={claim.id} className="flex flex-col gap-4 rounded-xl border border-border bg-surface-secondary/70 p-4">
                      
                      {/* Verdict Banner */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                            Factual Verdict
                          </span>
                          <span className={cn("rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", getVerdictColor(claimVerdict))}>
                            {claimVerdict}
                          </span>
                        </div>
                        
                        <div className="text-[14px] font-medium text-text-primary">
                          &ldquo;{decodeHtmlEntities(claim.text)}&rdquo;
                        </div>
                        
                        <div className="text-[13px] text-text-secondary">
                          {claim.explanation ? decodeHtmlEntities(claim.explanation) : getVerdictDescription(claimVerdict)}
                        </div>
                      </div>

                      {/* Evidence List */}
                      {claim.evidence && claim.evidence.length > 0 && (
                        <div className="flex flex-col gap-3 border-t border-border pt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                              Retrieved Evidence ({claim.evidence.length})
                            </span>
                          </div>

                          <div className="flex flex-col gap-3">
                            {claim.evidence.map((ev: EvidenceVM) => {
                              const cleanTitle = decodeHtmlEntities(ev.title || ev.source || "Authoritative Source");
                              const cleanSnippet = decodeHtmlEntities(ev.snippet);
                              
                              return (
                                <div key={ev.id} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <a 
                                      href={ev.url ?? "#"} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="font-medium text-signal hover:text-signal-bright flex items-center gap-1.5 text-[14px] hover:underline"
                                    >
                                      <span>{cleanTitle}</span>
                                      {ev.url && <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                                    </a>
                                    
                                    {ev.relation && (
                                      <span className={cn(
                                        "rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider shrink-0",
                                        ev.relation === "supporting" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                        ev.relation === "contradicting" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                        "bg-surface-tertiary text-text-muted border border-border"
                                      )}>
                                        {ev.relation}
                                      </span>
                                    )}
                                  </div>

                                  {cleanSnippet && (
                                    <p className="text-[13px] leading-relaxed text-text-secondary">
                                      &ldquo;{cleanSnippet}&rdquo;
                                    </p>
                                  )}
                                  
                                  {/* Technical Details Accordion */}
                                  <details className="group mt-1 pt-1 border-t border-border/40">
                                    <summary className="flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-text-muted hover:text-text-primary transition-colors">
                                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                                      <span>Technical details</span>
                                    </summary>
                                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-surface-tertiary/70 p-2.5 text-[12px] text-text-secondary font-mono">
                                      <div className="flex flex-col">
                                        <span className="text-[11px] text-text-muted font-sans uppercase">Relevance (BGE)</span>
                                        <span className="text-text-primary">{ev.bgeScore != null ? (ev.bgeScore * 100).toFixed(1) + "%" : "—"}</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[11px] text-text-muted font-sans uppercase">Credibility</span>
                                        <span className="text-text-primary">{ev.credibility != null ? (ev.credibility * 100).toFixed(1) + "%" : "—"}</span>
                                      </div>
                                      <div className="col-span-2 flex flex-col border-t border-border/40 pt-2 mt-1">
                                        <span className="text-[11px] text-text-muted font-sans uppercase mb-1">NLI Classification</span>
                                        <div className="flex justify-between text-[11px]">
                                          <span className="text-emerald-400">Entailment: {ev.nli?.entailment != null ? (ev.nli.entailment * 100).toFixed(1) + "%" : "—"}</span>
                                          <span className="text-rose-400">Contradiction: {ev.nli?.contradiction != null ? (ev.nli.contradiction * 100).toFixed(1) + "%" : "—"}</span>
                                          <span className="text-text-muted">Neutral: {ev.nli?.neutral != null ? (ev.nli.neutral * 100).toFixed(1) + "%" : "—"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </details>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* If fast-path accepted */}
            {result.verifierSkipped && !result.answer?.final?.startsWith("Hello!") && !result.answer?.final?.startsWith("You're welcome!") && !result.answer?.final?.startsWith("I am HalluciGuard") && (
              <div className="mt-1 rounded-xl border border-border bg-surface-secondary/70 p-4 text-[14px] text-text-secondary">
                <div className="flex items-center gap-2 mb-1 text-text-primary font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Fast-Path Accepted
                </div>
                The detector classified this response as low-risk. Full web retrieval was not required.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

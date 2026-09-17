"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Info } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Tooltip } from "@/components/ui/Tooltip";
import { ExecutionStage } from "@/components/verify/ExecutionStage";
import { buildDisplayStages } from "@/lib/api/map";
import { duration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { VerificationResult } from "@/lib/api/types";
import type { VerifyPhase } from "@/lib/hooks/useVerification";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function VerificationPipeline({
  phase,
  elapsedMs,
  result,
  className,
}: {
  phase: VerifyPhase;
  elapsedMs: number;
  result: VerificationResult | null;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const running = phase === "running";
  const complete = phase === "complete" && !!result;

  const stages = useMemo(() => {
    if (complete && result) return buildDisplayStages(result.stages, result.verifierSkipped);
    // Awaiting service: show the canonical rail as queued (no status claims).
    return buildDisplayStages([], false);
  }, [complete, result]);

  // Honest replay: once real data is in, reveal recorded stages in order.
  const [revealed, setRevealed] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];

    if (!complete) {
      setRevealed(0);
      return;
    }
    if (reduced) {
      setRevealed(stages.length);
      return;
    }
    setRevealed(0);
    for (let i = 0; i < stages.length; i++) {
      const t = window.setTimeout(() => setRevealed(i + 1), 120 + i * 130);
      timers.current.push(t);
    }
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [complete, reduced, stages.length]);

  const verifierSkipped = complete && result?.verifierSkipped;

  return (
    <Panel className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className={cn("h-4 w-4 text-signal", running && "hg-signal-pulse")} aria-hidden="true" />
          <span className="hg-eyebrow">Verification pipeline</span>
        </div>
        <div className="flex items-center gap-3">
          {running && (
            <span className="tnum font-mono text-[12px] text-ink-muted" aria-live="polite">
              {duration(elapsedMs)} elapsed
            </span>
          )}
          {complete && result?.totalLatencyMs != null && (
            <span className="tnum font-mono text-[12px] text-ink-muted">
              {duration(result.totalLatencyMs)} total
            </span>
          )}
          <Tooltip content="n8n retrieves and orchestrates evidence. The BGE reranker, DeBERTa NLI, and scoring that decide the verdict all run in Python — n8n never judges.">
            <span className="inline-flex items-center gap-1 text-[12px] text-ink-dim">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              How stages map
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Status line */}
      <div className="border-b border-line-faint px-4 py-2.5">
        {running && (
          <p className="flex items-center gap-2 text-[13px] text-ink-muted" aria-live="polite">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" aria-hidden="true" />
            Awaiting the verification service. The backend runs the full pipeline and returns one
            recorded result — no fabricated progress is shown here.
          </p>
        )}
        {verifierSkipped && (
          <p className="text-[13px] text-ink-muted">
            The detector classified this answer as low-risk and accepted it on the fast path. The
            verifier was <span className="font-medium text-ink">not invoked</span>, so no retrieval,
            reranking, NLI, or scoring ran.
          </p>
        )}
        {complete && !verifierSkipped && (
          <p className="text-[13px] text-ink-muted">
            Recorded execution — each stage below shows its real reported status and duration.
          </p>
        )}
      </div>

      {/* Rail */}
      <div className="px-4 py-4">
        <ol className="m-0 list-none p-0">
          {stages.map((stage, i) => (
            <ExecutionStage
              key={stage.id}
              stage={stage}
              index={i}
              isLast={i === stages.length - 1}
              revealed={complete ? i < revealed : false}
              pending={running}
            />
          ))}
        </ol>
      </div>
    </Panel>
  );
}

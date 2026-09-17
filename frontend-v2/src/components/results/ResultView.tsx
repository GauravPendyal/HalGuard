"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { VerdictCard } from "@/components/results/VerdictCard";
import { ClaimCard } from "@/components/results/ClaimCard";
import { DetectorReadout } from "@/components/results/DetectorReadout";
import { RetrievalSummary } from "@/components/results/RetrievalSummary";
import { ModelExecutionTrace } from "@/components/results/ModelExecutionTrace";
import { AdvancedTrace } from "@/components/results/AdvancedTrace";
import type { VerificationResult } from "@/lib/api/types";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="hg-eyebrow">{children}</span>
      <span className="h-px flex-1 bg-line-faint" />
    </div>
  );
}

/**
 * ResultView — assembles the verification report. Order is deliberate:
 * answer + overall reading first, then the detector decision, then (only if the
 * verifier ran) the claim-by-claim evidence, retrieval, and model execution, and
 * finally the raw trace for auditors.
 */
export function ResultView({ result }: { result: VerificationResult }) {
  const hasClaims = result.claims.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Answer + overall verdict */}
      <section aria-label="Answer and verdict">
        <VerdictCard result={result} />
      </section>

      {/* Detector decision (and retrieval, when the verifier ran) */}
      <section aria-label="Decision and retrieval">
        <SectionLabel>Decision path</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DetectorReadout detector={result.detector} verifierSkipped={result.verifierSkipped} />
          {result.retrieval && <RetrievalSummary retrieval={result.retrieval} />}
        </div>
      </section>

      {/* Claim-by-claim */}
      {hasClaims && (
        <section aria-label="Claim-by-claim verification">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              Claim-by-claim
            </span>
          </SectionLabel>
          <div className="flex flex-col gap-3">
            {result.claims.map((claim, i) => (
              <ClaimCard key={claim.id} claim={claim} index={i} defaultOpen={result.claims.length === 1 || i === 0} />
            ))}
          </div>
        </section>
      )}

      {/* Model execution */}
      {result.runtimeModels && (
        <section aria-label="Model execution">
          <SectionLabel>Model execution</SectionLabel>
          <ModelExecutionTrace models={result.runtimeModels} />
        </section>
      )}

      {/* Advanced / raw */}
      <section aria-label="Advanced trace">
        <AdvancedTrace result={result} />
      </section>
    </div>
  );
}

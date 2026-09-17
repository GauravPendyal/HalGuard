import * as React from "react";
import { Cpu } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { EMPTY } from "@/lib/utils/format";
import type { RuntimeModelsVM } from "@/lib/api/types";

function SpecRow({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-faint py-2 last:border-0">
      <dt className="shrink-0 text-[12.5px] text-ink-dim">{label}</dt>
      <dd className={mono ? "text-right font-mono text-[12px] text-ink-muted" : "text-right text-[13px] text-ink-muted"}>
        {value ?? EMPTY}
      </dd>
    </div>
  );
}

/**
 * ModelExecutionTrace — exactly which models the backend reported running for
 * this verification. This is the honest counterpart to "which models judged":
 * the reranker, NLI, and cross-encoder here are the ones that produced the
 * scores shown elsewhere. Missing entries render as "—", never guessed.
 */
export function ModelExecutionTrace({ models }: { models: RuntimeModelsVM | null }) {
  if (!models) {
    return (
      <Panel className="p-4">
        <p className="text-[13px] text-ink-dim">
          No runtime model information was reported for this run.
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Cpu className="h-4 w-4 text-ink-muted" aria-hidden="true" />
        <span className="hg-eyebrow">Model execution</span>
      </div>
      <dl className="grid grid-cols-1 gap-x-8 px-4 py-2 sm:grid-cols-2">
        <SpecRow label="Embedding" value={models.embeddingModel} mono />
        <SpecRow label="Reranker (BGE)" value={models.rerankerModel} mono />
        <SpecRow label="NLI" value={models.nliModel} mono />
        <SpecRow label="Cross-encoder" value={models.crossEncoder} mono />
        <SpecRow label="Classification" value={models.classificationModel} mono />
        <SpecRow label="Retrieval strategy" value={models.retrievalStrategy} />
        <SpecRow label="Device" value={models.device} mono />
        <SpecRow label="Claim complexity" value={models.claimComplexity} />
        <SpecRow label="Latency budget" value={models.latencyBudget} />
      </dl>
      {models.routingReason && (
        <div className="border-t border-line-faint px-4 py-3">
          <div className="hg-eyebrow mb-1">Routing reason</div>
          <p className="text-[13px] leading-relaxed text-ink-muted">{models.routingReason}</p>
        </div>
      )}
    </Panel>
  );
}

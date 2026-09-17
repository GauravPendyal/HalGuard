import * as React from "react";
import { Network, Check, X, Database } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { count as fmtCount, EMPTY } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { RetrievalSummaryVM } from "@/lib/api/types";

function SourceChip({ name, state }: { name: string; state: "succeeded" | "failed" | "attempted" }) {
  const meta = {
    succeeded: { cls: "border-verified/35 bg-verified-deep text-verified", Icon: Check },
    failed: { cls: "border-contradicted/35 bg-contradicted-deep text-contradicted", Icon: X },
    attempted: { cls: "border-line-strong bg-panel-inset text-ink-muted", Icon: Database },
  }[state];
  const Icon = meta.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px]", meta.cls)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {name}
    </span>
  );
}

/**
 * RetrievalSummary — the n8n retrieval/orchestration layer, shown honestly:
 * which sources were attempted, which returned evidence, and which failed. A
 * standing note reinforces that n8n only retrieves — the reranker, NLI, and
 * scoring that decide the verdict run in Python.
 */
export function RetrievalSummary({ retrieval }: { retrieval: RetrievalSummaryVM | null }) {
  if (!retrieval) {
    return (
      <Panel className="p-4">
        <p className="text-[13px] text-ink-dim">No retrieval information was reported for this run.</p>
      </Panel>
    );
  }

  // Sources that were attempted but neither explicitly succeeded nor failed.
  const resolved = new Set([...retrieval.succeeded, ...retrieval.failed]);
  const onlyAttempted = retrieval.attempted.filter((s) => !resolved.has(s));

  const hasAnySource =
    retrieval.succeeded.length + retrieval.failed.length + onlyAttempted.length > 0;

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <Network className="h-4 w-4 text-conflicted" aria-hidden="true" />
          <span className="hg-eyebrow">Retrieval · n8n orchestration</span>
        </span>
        {retrieval.cacheHit != null && (
          <span className="font-mono text-[11px] text-ink-dim">
            {retrieval.cacheHit ? "cache hit" : "live retrieval"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-4">
          <div className="flex flex-col">
            <span className="text-ink-dim">Adapter</span>
            <span className="truncate font-mono text-[12px] text-ink-muted">{retrieval.adapter ?? EMPTY}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-ink-dim">Domain</span>
            <span className="font-mono text-[12px] text-ink-muted">
              {retrieval.domain ?? EMPTY}
              {retrieval.domainValidated === true && <span className="ml-1 text-verified">✓</span>}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-ink-dim">Retrieved</span>
            <span className="tnum font-mono text-[12px] text-ink-muted">{fmtCount(retrieval.retrievedSources)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-ink-dim">In decision set</span>
            <span className="tnum font-mono text-[12px] text-ink-muted">{fmtCount(retrieval.verifiedSources)}</span>
          </div>
        </div>

        {hasAnySource && (
          <div className="flex flex-wrap gap-2">
            {retrieval.succeeded.map((s) => (
              <SourceChip key={`s-${s}`} name={s} state="succeeded" />
            ))}
            {retrieval.failed.map((s) => (
              <SourceChip key={`f-${s}`} name={s} state="failed" />
            ))}
            {onlyAttempted.map((s) => (
              <SourceChip key={`a-${s}`} name={s} state="attempted" />
            ))}
          </div>
        )}

        <p className="rounded-md border border-line bg-panel-inset px-3 py-2 text-[12px] leading-relaxed text-ink-dim">
          n8n handles retrieval and orchestration only — domain routing, source calls, fallback, and
          de-duplication. The BGE reranker, DeBERTa NLI, and evidence scoring that determine each verdict
          run in Python.
        </p>
      </div>
    </Panel>
  );
}

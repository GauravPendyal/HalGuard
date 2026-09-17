import * as React from "react";
import { ShieldAlert, ArrowRightCircle } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Meter } from "@/components/ui/ScoreDisplay";
import { percent, EMPTY } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { DetectorVM, RiskLevel } from "@/lib/api/types";

const RISK_META: Record<RiskLevel, { label: string; cls: string; tone: "support" | "trust" | "refute" }> = {
  LOW: { label: "Low risk", cls: "border-verified/35 bg-verified-deep text-verified", tone: "support" },
  MEDIUM: { label: "Medium risk", cls: "border-signal/40 bg-signal-deep text-signal-bright", tone: "trust" },
  HIGH: { label: "High risk", cls: "border-contradicted/35 bg-contradicted-deep text-contradicted", tone: "refute" },
};

/**
 * DetectorReadout — the first-stage hallucination detector's reading and the
 * routing decision it produced. This is what determines whether the verifier
 * runs at all, so it is shown even when (especially when) the verifier is
 * skipped, making the fast-path honest and legible.
 */
export function DetectorReadout({ detector, verifierSkipped }: { detector: DetectorVM | null; verifierSkipped: boolean }) {
  if (!detector) {
    return (
      <Panel className="p-4">
        <p className="text-[13px] text-ink-dim">No detector reading was reported for this run.</p>
      </Panel>
    );
  }

  const risk = detector.riskLevel ? RISK_META[detector.riskLevel] : null;

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          <span className="hg-eyebrow">Hallucination detector</span>
        </span>
        {risk && (
          <span className={cn("rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider", risk.cls)}>
            {risk.label}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-ink-muted">Hallucination probability</span>
            <span className="tnum font-mono text-[13px] font-medium text-ink">
              {percent(detector.hallucinationProbability)}
            </span>
          </div>
          <Meter
            value={detector.hallucinationProbability}
            tone={risk?.tone ?? "neutral"}
            aria-label="Hallucination probability"
          />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
          <div className="flex items-center justify-between border-b border-line-faint py-1.5">
            <span className="text-ink-dim">Detector confidence</span>
            <span className="tnum font-mono text-ink-muted">{percent(detector.confidence)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-line-faint py-1.5">
            <span className="text-ink-dim">Model</span>
            <span className="truncate font-mono text-[11px] text-ink-muted">{detector.modelSource ?? EMPTY}</span>
          </div>
        </div>

        {/* Routing decision */}
        <div className="flex items-start gap-2 rounded-md border border-line bg-panel-inset p-3">
          <ArrowRightCircle className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-ink-muted">
            {detector.nextAction ? (
              <>
                Decision: <span className="font-medium text-ink">{detector.nextAction}</span>.{" "}
              </>
            ) : null}
            {verifierSkipped
              ? "Risk was low enough to accept without evidence verification — the verifier did not run."
              : "Risk warranted full evidence verification — the verifier pipeline was invoked."}
          </p>
        </div>
      </div>
    </Panel>
  );
}

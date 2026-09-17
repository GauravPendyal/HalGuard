"use client";

import * as React from "react";
import { Check, X, Minus, Loader2, Circle } from "lucide-react";
import { duration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { StageStatus } from "@/lib/api/types";
import type { DisplayStage } from "@/lib/api/map";

/** Status presentation — icon + label + tone, so status never relies on color alone. */
function statusPresentation(status: StageStatus | null) {
  switch (status) {
    case "completed":
      return { Icon: Check, label: "Completed", ring: "border-verified/50 bg-verified-deep text-verified", text: "text-verified" };
    case "running":
      return { Icon: Loader2, label: "Running", ring: "border-signal/60 bg-signal-deep text-signal", text: "text-signal", spin: true };
    case "failed":
      return { Icon: X, label: "Failed", ring: "border-contradicted/50 bg-contradicted-deep text-contradicted", text: "text-contradicted" };
    case "skipped":
      return { Icon: Minus, label: "Skipped", ring: "border-line-strong bg-panel-inset text-ink-dim", text: "text-ink-dim" };
    default:
      return { Icon: Circle, label: "Not reported", ring: "border-line bg-panel-inset text-ink-faint", text: "text-ink-faint" };
  }
}

const OWNER_META = {
  n8n: { label: "n8n · retrieval", cls: "border-[color:var(--color-conflicted)]/30 text-conflicted bg-[color:var(--color-conflicted-deep)]" },
  python: { label: "python · analysis", cls: "border-line-strong text-ink-muted bg-panel-inset" },
} as const;

export function ExecutionStage({
  stage,
  index,
  isLast,
  revealed,
  pending,
}: {
  stage: DisplayStage;
  index: number;
  isLast: boolean;
  /** Whether this stage's real result has been revealed in the replay. */
  revealed: boolean;
  /** Awaiting-service state: no result yet, show as queued (no status claim). */
  pending?: boolean;
}) {
  const effectiveStatus = pending ? null : stage.status;
  const pres = statusPresentation(effectiveStatus);
  const owner = OWNER_META[stage.owner];
  const Icon = pres.Icon;

  return (
    <li className="relative flex gap-3">
      {/* Rail + node */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "z-10 flex h-7 w-7 items-center justify-center rounded-full border transition-colors duration-300",
            revealed || pending ? pres.ring : "border-line bg-panel-inset text-ink-faint",
          )}
          aria-hidden="true"
        >
          <Icon className={cn("h-3.5 w-3.5", pres.spin && "animate-spin")} />
        </span>
        {!isLast && (
          <span
            className={cn(
              "w-px flex-1 transition-colors duration-500",
              revealed ? "bg-line-strong" : "bg-line-faint",
            )}
          />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "min-w-0 flex-1 pb-6 transition-opacity duration-300",
          revealed || pending ? "opacity-100" : "opacity-45",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-mono text-[11px] text-ink-faint tnum">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[14px] font-medium text-ink">{stage.label}</span>
          <span
            className={cn(
              "rounded-sm border px-1.5 py-px font-mono text-[10px] uppercase tracking-wider",
              owner.cls,
            )}
          >
            {owner.label}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {revealed && stage.durationMs != null && (
              <span className="tnum font-mono text-[12px] text-ink-muted">
                {duration(stage.durationMs)}
              </span>
            )}
            <span className={cn("text-[11px] font-medium", pending ? "text-ink-faint" : pres.text)}>
              {pending ? "Queued" : pres.label}
            </span>
          </span>
        </div>
        {revealed && stage.details && (
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-dim">{stage.details}</p>
        )}
      </div>
    </li>
  );
}

"use client";

import * as React from "react";
import { ChevronRight, Trash2, Layers, Clock, CircleSlash } from "lucide-react";
import { verdictMeta } from "@/lib/verdict";
import { relativeTime, duration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { HistoryEntry } from "@/lib/history/store";

/**
 * HistoryList — a compact, scannable ledger of past verifications. Each row
 * leads with the verdict (icon + label, never color alone), then the claim and
 * its telemetry. Opening and removing are separate controls so neither is
 * triggered by accident.
 */
export function HistoryList({
  entries,
  onOpen,
  onRemove,
}: {
  entries: HistoryEntry[];
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2 p-0" role="list">
      {entries.map((entry) => {
        const meta = verdictMeta(entry.overallVerdict);
        const Icon = meta.Icon;
        const statusLabel = entry.overallVerdict
          ? meta.label
          : (entry.verificationStatus ?? "No verdict").replace(/_/g, " ");

        return (
          <li
            key={entry.id}
            className={cn(
              "group flex items-stretch overflow-hidden rounded-lg border border-line border-l-2 bg-panel",
              meta.accentClass,
            )}
          >
            <button
              onClick={() => onOpen(entry.id)}
              className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3.5 text-left hover:bg-panel-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
              aria-label={`Open verification: ${entry.query}`}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.textClass)} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-sm border px-1.5 py-px font-mono text-[10px] uppercase tracking-wider",
                      meta.chipClass,
                    )}
                  >
                    {statusLabel}
                  </span>
                  {entry.verifierSkipped && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                      <CircleSlash className="h-3 w-3" aria-hidden="true" />
                      Fast path
                    </span>
                  )}
                </span>
                <span className="mt-1.5 line-clamp-2 block text-[14px] leading-snug text-ink">
                  {entry.query}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-dim">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {relativeTime(entry.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3 w-3" aria-hidden="true" />
                    <span className="tnum">{entry.claimCount}</span> claim{entry.claimCount === 1 ? "" : "s"}
                  </span>
                  {entry.totalLatencyMs != null && (
                    <span className="tnum font-mono">{duration(entry.totalLatencyMs)}</span>
                  )}
                </span>
              </span>
              <ChevronRight
                className="mt-1 h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-ink-dim"
                aria-hidden="true"
              />
            </button>

            <button
              onClick={() => onRemove(entry.id)}
              className="flex w-11 shrink-0 items-center justify-center border-l border-line-faint text-ink-faint hover:bg-contradicted-deep hover:text-contradicted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
              aria-label={`Remove from history: ${entry.query}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import * as React from "react";
import { useState } from "react";
import { Terminal, ChevronDown, Check, Copy } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { duration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { TraceEventVM, VerificationResult } from "@/lib/api/types";

function statusCls(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed") return "text-verified";
  if (s === "failed" || s === "rejected") return "text-contradicted";
  if (s === "skipped") return "text-ink-dim";
  if (s === "started" || s === "running" || s === "scheduled") return "text-signal";
  return "text-ink-muted";
}

function TraceRow({ event, isLast }: { event: TraceEventVM; isLast: boolean }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={cn("mt-1 h-2 w-2 rounded-full bg-current", statusCls(event.status))} aria-hidden="true" />
        {!isLast && <span className="w-px flex-1 bg-line-faint" />}
      </div>
      <div className="min-w-0 flex-1 pb-3">
        <div className="flex flex-wrap items-center gap-x-2.5">
          <span className="font-mono text-[13px] text-ink">{event.node}</span>
          <span className={cn("font-mono text-[11px]", statusCls(event.status))}>{event.status}</span>
          {event.latencyMs != null && (
            <span className="tnum ml-auto font-mono text-[11px] text-ink-dim">{duration(event.latencyMs)}</span>
          )}
          {event.retryCount != null && event.retryCount > 0 && (
            <span className="font-mono text-[11px] text-signal">retry ×{event.retryCount}</span>
          )}
        </div>
        {event.details && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-dim">{event.details}</p>}
      </div>
    </li>
  );
}

/**
 * AdvancedTrace — the raw orchestration record for auditors: the LangGraph node
 * trace and the complete backend payload. Nothing here is synthesized; it is the
 * response exactly as returned, offered for full transparency.
 */
export function AdvancedTrace({ result }: { result: VerificationResult }) {
  const [open, setOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawJson = React.useMemo(() => JSON.stringify(result.raw, null, 2), [result.raw]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <Panel>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-panel-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
      >
        <span className="inline-flex items-center gap-2">
          <Terminal className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          <span className="hg-eyebrow">Orchestration trace &amp; raw payload</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-ink-dim transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div className="border-t border-line px-4 py-4 [animation:hg-rise_0.15s_ease]">
          {result.trace.length > 0 ? (
            <ol className="m-0 list-none p-0">
              {result.trace.map((e, i) => (
                <TraceRow key={`${e.node}-${i}`} event={e} isLast={i === result.trace.length - 1} />
              ))}
            </ol>
          ) : (
            <p className="text-[13px] text-ink-dim">No trace events were reported.</p>
          )}

          {result.errors.length > 0 && (
            <div className="mt-3 rounded-md border border-contradicted/30 bg-contradicted-deep px-3 py-2">
              <div className="hg-eyebrow mb-1 text-contradicted">Errors</div>
              <ul className="list-inside list-disc text-[12.5px] text-ink-muted">
                {result.errors.map((e, i) => (
                  <li key={i} className="font-mono">{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw payload */}
          <div className="mt-4 border-t border-line-faint pt-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setRawOpen((v) => !v)}
                aria-expanded={rawOpen}
                className="inline-flex items-center gap-1.5 text-[12px] text-ink-dim hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-signal"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", rawOpen && "rotate-180")} aria-hidden="true" />
                Raw JSON response
              </button>
              {rawOpen && (
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-[12px] text-ink-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-verified" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            {rawOpen && (
              <pre className="mt-2 max-h-[420px] overflow-auto rounded-md border border-line bg-canvas-sunken p-3 font-mono text-[11.5px] leading-relaxed text-ink-muted">
                {rawJson}
              </pre>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

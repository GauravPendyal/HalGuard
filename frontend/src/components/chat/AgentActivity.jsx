"use client";

import { useState } from "react";
import { ChevronRight, Check } from "lucide-react";

const ALL = ["Detector", "Verifier", "Judge", "Corrector", "ReVerifier", "Memory"];

export function AgentActivity({ pipeline = [], defaultOpen = false, mode }) {
  const [open, setOpen] = useState(defaultOpen);
  const ran = new Map(pipeline.map((p) => [p.agent, p.detail]));
  return (
    <div className="mt-3" data-testid="agent-activity">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="agent-activity-toggle"
        className="flex items-center gap-1.5 rounded-lg py-1 text-[12px] text-hg-muted transition-colors hover:text-hg-text2">
        <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`} /> Details
        {mode === "deep" && <span className="ml-1 rounded-full bg-[var(--accent-soft)] px-1.5 py-px font-mono text-[10px] text-hg-accent">deep</span>}
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <ol className="mt-2 space-y-1 pl-1" data-testid="pipeline-list">
            {ALL.map((agent) => {
              const detail = ran.get(agent);
              return (
                <li key={agent} className="flex items-center gap-3 text-[12.5px]">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full ${detail ? "bg-[var(--accent-soft)] text-hg-accent" : "border border-hg-line text-transparent"}`}>{detail && <Check className="h-2.5 w-2.5" strokeWidth={3} />}</span>
                  <span className={`w-20 font-mono text-[11px] ${detail ? "text-hg-text" : "text-hg-muted/60"}`}>{agent}</span>
                  <span className="text-hg-muted">{detail || "skipped"}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

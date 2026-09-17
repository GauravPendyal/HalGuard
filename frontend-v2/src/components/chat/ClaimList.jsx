"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { RELATIONSHIPS, VERDICTS } from "@/lib/format";
import { StatusPill } from "./StatusPill";
import { useChat } from "@/context/ChatContext";

function ClaimItem({ claim, index, evidence, open, onToggle }) {
  const { setSource } = useChat();
  const meta = VERDICTS[claim.status] || VERDICTS.uncertain;
  const linked = evidence.filter((e) => claim.evidence_ids?.includes(e.id));
  return (
    <li className="border-t border-[var(--border)] first:border-t-0" data-testid={`claim-item-${index}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-hg-sunken" data-testid={`claim-toggle-${index}`}>
        <span className="font-mono text-[11px] text-hg-muted">{String(index + 1).padStart(2, "0")}</span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
        <span className="min-w-0 flex-1 truncate text-[13.5px] text-hg-text">{open ? meta.label : claim.text}</span>
        {!open && <span className="hidden text-[11.5px] sm:block" style={{ color: meta.color }}>{meta.label}</span>}
        <ChevronRight className={`h-3.5 w-3.5 text-hg-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="px-2 pb-4 pl-9" data-testid={`claim-detail-${index}`}>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-hg-muted">Claim</div>
            <p className="mt-1 text-[14px] leading-relaxed text-hg-text">“{claim.text}”</p>
            <div className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-hg-muted">Verification</div>
            <div className="mt-1"><StatusPill verdict={claim.status} /></div>
            {linked.length > 0 && (
              <>
                <div className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-hg-muted">Evidence</div>
                <ul className="mt-1 space-y-2">
                  {linked.map((e) => {
                    const rel = RELATIONSHIPS[e.relationship] || RELATIONSHIPS.context;
                    return (
                      <li key={e.id} className="text-[13px] text-hg-text2">
                        <button type="button" onClick={() => setSource(e)} className="font-medium text-hg-text hover:text-hg-accent">{e.source}</button>
                        <span className="mx-1.5 text-hg-muted">·</span><span style={{ color: VERDICTS[rel.verdict].color }}>{rel.label}</span>
                        <p className="mt-0.5 line-clamp-2">“{e.excerpt}”</p>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function ClaimList({ claims = [], evidence = [] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  if (claims.length < 2) return null;
  return (
    <div className="mt-2" data-testid="claim-list">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="claim-list-toggle"
        className="flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-[13px] text-hg-text2 transition-colors hover:text-hg-text">
        <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        <span className="font-medium text-hg-text">{claims.length} claims analyzed</span>
        <span className="ml-1 flex items-center gap-1">
          {claims.map((c) => <span key={c.id} className="h-1.5 w-1.5 rounded-full" style={{ background: (VERDICTS[c.status] || VERDICTS.uncertain).color }} />)}
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <ol className="mt-1 rounded-[14px] border border-hg-line bg-hg-surface/50 px-1">
            {claims.map((c, i) => <ClaimItem key={c.id} claim={c} index={i} evidence={evidence} open={active === i} onToggle={() => setActive(active === i ? null : i)} />)}
          </ol>
        </div>
      </div>
    </div>
  );
}

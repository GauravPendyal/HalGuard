"use client";

import { useState } from "react";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { RELATIONSHIPS, VERDICTS } from "@/lib/format";
import { StatusPill } from "./StatusPill";

export function EvidenceItem({ item, last }) {
  const { setSource } = useChat();
  const rel = RELATIONSHIPS[item.relationship] || RELATIONSHIPS.context;
  const color = VERDICTS[rel.verdict].color;
  return (
    <li className="relative pl-7" data-testid="evidence-item">
      {!last && <span className="absolute left-[9px] top-5 h-[calc(100%-4px)] w-px bg-[var(--border)]" aria-hidden="true" />}
      <span className="absolute left-[5px] top-[7px] flex h-[9px] w-[9px] items-center justify-center rounded-full border bg-hg-bg" style={{ borderColor: color }} aria-hidden="true">
        <span className="h-[3px] w-[3px] rounded-full" style={{ background: color }} />
      </span>
      <div className="pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-hg-sunken font-mono text-[10px] font-medium text-hg-text2">{item.source[0]}</span>
          <span className="text-[13.5px] font-medium text-hg-text">{item.source}</span>
          <span className="text-[11.5px] text-hg-muted">{item.domain}</span>
          <StatusPill verdict={rel.verdict} label={rel.label} dot={false} className="ml-auto" />
        </div>
        <div className="mt-1 text-[12.5px] text-hg-text2">{item.title}</div>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-hg-text2 line-clamp-2">“{item.excerpt}”</p>
        <button type="button" onClick={() => setSource(item)} className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-hg-accent transition-colors hover:text-hg-accentHover" data-testid="open-source-button">
          Open source <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}

export function EvidenceTrace({ evidence = [], counts, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!evidence.length) return null;
  const c = counts || { sources: evidence.length, supporting: evidence.filter((e) => e.relationship === "supports").length, contradicting: evidence.filter((e) => e.relationship === "contradicts").length };
  return (
    <div className="mt-5" data-testid="evidence-trace">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="evidence-trace-toggle"
        className="group flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-[13px] text-hg-text2 transition-colors hover:text-hg-text">
        <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        <span className="font-medium text-hg-text">Evidence trace</span>
        <span className="text-hg-muted">·</span><span>{c.sources} source{c.sources !== 1 && "s"}</span>
        <span className="text-hg-muted">·</span><span className="text-hg-supported">{c.supporting} supporting</span>
        <span className="text-hg-muted">·</span><span className="text-hg-contradicted">{c.contradicting} contradicting</span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <ol className="mt-2 pl-1" data-testid="evidence-list">
            {evidence.map((e, i) => <EvidenceItem key={e.id} item={e} last={i === evidence.length - 1} />)}
          </ol>
        </div>
      </div>
    </div>
  );
}

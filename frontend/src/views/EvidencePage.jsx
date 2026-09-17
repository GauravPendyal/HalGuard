"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { useChat } from "@/context/ChatContext";
import { RELATIONSHIPS, VERDICTS, relativeTime } from "@/lib/format";
import { PageFrame } from "./HistoryPage";
import { StatusPill } from "@/components/chat/StatusPill";

export default function EvidencePage() {
  const { setSource, conversations } = useChat();
  const [items, setItems] = useState([]);
  const [rel, setRel] = useState("all");

  useEffect(() => { api.listEvidence().then(setItems).catch(() => {}); }, [conversations]);

  const list = useMemo(() => items.filter((e) => rel === "all" || e.relationship === rel), [items, rel]);
  const bySource = useMemo(() => Object.entries(list.reduce((acc, e) => ((acc[e.source] = acc[e.source] || []).push(e), acc), {})), [list]);

  return (
    <PageFrame eyebrow="Evidence" title="Every source, traceable" testId="evidence-page">
      <p className="mt-2 max-w-lg text-[14px] text-hg-text2">{items.length} passages retrieved across your verifications. Inspect any excerpt and its relationship to the claim.</p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {[["all", "All"], ["supports", "Supports"], ["contradicts", "Contradicts"], ["context", "Context"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setRel(id)} className="hg-pill" data-active={rel === id} data-testid={`evidence-filter-${id}`}>{label}</button>
        ))}
      </div>
      <div className="mt-6 space-y-8" data-testid="evidence-groups">
        {bySource.map(([source, list]) => (
          <section key={source}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-hg-sunken font-mono text-[11px] text-hg-text2">{source[0]}</span>
              <h2 className="text-[14px] font-semibold text-hg-text">{source}</h2>
              <span className="text-[12px] text-hg-muted">{list[0].domain} · {list.length}</span>
            </div>
            <ol className="relative ml-3 border-l border-[var(--border)] pl-5">
              {list.map((e) => {
                const r = RELATIONSHIPS[e.relationship] || RELATIONSHIPS.context;
                return (
                  <li key={e.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[25px] top-[9px] h-2 w-2 rounded-full border bg-hg-bg" style={{ borderColor: VERDICTS[r.verdict].color }} />
                    <button type="button" onClick={() => setSource(e)} className="group w-full rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-hg-sunken" data-testid="evidence-page-item">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-medium text-hg-text">{e.title}</span>
                        <StatusPill verdict={r.verdict} label={r.label} dot={false} />
                        <span className="ml-auto text-[11.5px] text-hg-muted">{relativeTime(e.created_at)}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13.5px] text-hg-text2">“{e.excerpt}”</p>
                      <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-hg-muted group-hover:text-hg-accent">{e.conversation_title} <ArrowUpRight className="h-3 w-3" /></div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        {bySource.length === 0 && <p className="py-10 text-center text-[13.5px] text-hg-muted">No evidence retrieved yet.</p>}
      </div>
    </PageFrame>
  );
}

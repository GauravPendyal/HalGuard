"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, CornerDownLeft } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { CONV_STATUS, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusPill } from "@/components/chat/StatusPill";

export function SearchModal() {
  const { modal, setModal, conversations, newVerification, navigate } = useChat();
  const open = modal?.type === "search";
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => { if (open) { setQ(""); setCursor(0); } }, [open]);
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (term ? (conversations || []).filter((c) => c.title.toLowerCase().includes(term)) : conversations || []).slice(0, 8);
  }, [q, conversations]);
  useEffect(() => setCursor(0), [results.length]);

  const go = (c) => { setModal(null); navigate(`/c/${c.id}`); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[cursor]) go(results[cursor]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setModal(null)}>
      <DialogContent className="top-[18%] w-[min(600px,92vw)] translate-y-0 overflow-hidden rounded-[20px] border-hg-line bg-hg-surface p-0 text-hg-text shadow-hg-lg" data-testid="search-modal">
        <DialogTitle className="sr-only">Search verifications</DialogTitle>
        <DialogDescription className="sr-only">Find a previous verification by title</DialogDescription>
        <div className="flex items-center gap-3 border-b border-hg-line px-4">
          <Search className="h-4 w-4 text-hg-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search verifications..." aria-label="Search verifications" data-testid="search-input"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-hg-muted" />
          <kbd className="rounded-md border border-hg-line px-1.5 py-0.5 font-mono text-[10px] text-hg-muted">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          <button type="button" onClick={() => { setModal(null); newVerification(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] text-hg-text hover:bg-hg-sunken" data-testid="search-new-verification">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-soft)] text-hg-accent"><Plus className="h-3.5 w-3.5" /></span> New verification
          </button>
          {results.length > 0 && <div className="px-3 pb-1 pt-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-hg-muted">{q ? "Results" : "Recent"}</div>}
          <ul role="listbox" data-testid="search-results">
            {results.map((c, i) => {
              const st = CONV_STATUS[c.status] || CONV_STATUS.reviewing;
              return (
                <li key={c.id} role="option" aria-selected={i === cursor}>
                  <button type="button" onClick={() => go(c)} onMouseEnter={() => setCursor(i)} data-testid={`search-result-${c.id}`}
                    className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px]", i === cursor ? "bg-hg-sunken text-hg-text" : "text-hg-text2")}>
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    <span className="text-[11px] text-hg-muted">{relativeTime(c.updated_at)}</span>
                    <StatusPill verdict={st.verdict} label={st.label} dot={false} />
                    {i === cursor && <CornerDownLeft className="h-3.5 w-3.5 text-hg-muted" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {q && results.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-hg-muted" data-testid="search-empty">No verifications match “{q}”.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

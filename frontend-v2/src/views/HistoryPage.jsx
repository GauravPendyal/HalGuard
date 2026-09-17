"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Archive } from "lucide-react";
import { api } from "@/lib/api";
import { useChat } from "@/context/ChatContext";
import { CONV_STATUS, relativeTime } from "@/lib/format";
import { ChatHeader } from "@/components/shell/ChatHeader";
import { StatusPill } from "@/components/chat/StatusPill";
import { cn } from "@/lib/utils";

export function PageFrame({ title, eyebrow, children, testId }) {
  return (
    <div className="flex h-full w-full flex-col">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto px-5 pb-12 md:px-10" data-testid={testId}>
        <div className="mx-auto w-full max-w-[760px] pt-6 animate-hg-rise">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-hg-muted">{eyebrow}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-hg-text">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConversationRow({ c, onClick }) {
  const st = CONV_STATUS[c.status] || CONV_STATUS.reviewing;
  return (
    <button type="button" onClick={onClick} data-testid={`history-item-${c.id}`}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-hg-sunken">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] text-hg-text">{c.title}</div>
        <div className="mt-0.5 text-[12px] text-hg-muted">{relativeTime(c.updated_at)} · {c.message_count ?? 0} messages{c.pinned ? " · Pinned" : ""}</div>
      </div>
      <StatusPill verdict={st.verdict} label={st.label} />
    </button>
  );
}

export default function HistoryPage() {
  const { conversations, navigate } = useChat();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [archived, setArchived] = useState([]);

  useEffect(() => { if (filter === "archived") api.listConversations(true).then(setArchived).catch(() => {}); }, [filter]);

  const list = useMemo(() => {
    const src = filter === "archived" ? archived : (conversations || []);
    return src.filter((c) => (filter === "all" || filter === "archived" || c.status === filter) && c.title.toLowerCase().includes(q.toLowerCase()));
  }, [conversations, archived, filter, q]);

  const FILTERS = [["all", "All"], ["verified", "Verified"], ["needs_correction", "Needs correction"], ["reviewing", "Reviewing"], ["archived", "Archived"]];

  return (
    <PageFrame eyebrow="History" title="Recent verifications" testId="history-page">
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-full border border-hg-line bg-hg-surface px-3.5 py-2 text-[13.5px] focus-within:border-hg-accent">
          <Search className="h-4 w-4 text-hg-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title" className="flex-1 bg-transparent outline-none placeholder:text-hg-muted" data-testid="history-search" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={cn("hg-pill", id === "archived" && "gap-1")} data-active={filter === id} data-testid={`history-filter-${id}`}>{id === "archived" && <Archive className="h-3 w-3" />}{label}</button>
          ))}
        </div>
      </div>
      <div className="mt-4 divide-y divide-[var(--border)]" data-testid="history-list">
        {list.map((c) => <ConversationRow key={c.id} c={c} onClick={() => navigate(`/c/${c.id}`)} />)}
        {list.length === 0 && <p className="py-10 text-center text-[13.5px] text-hg-muted">No verifications here yet.</p>}
      </div>
    </PageFrame>
  );
}

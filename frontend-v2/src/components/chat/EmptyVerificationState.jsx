"use client";

import { ArrowUpRight } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { CONV_STATUS, USER, greeting, relativeTime } from "@/lib/format";
import { Orb } from "@/components/brand/Logo";
import { VerificationComposer } from "./VerificationComposer";
import { QuickActions } from "./QuickActions";
import { StatusPill } from "./StatusPill";

export function EmptyVerificationState({ onSend, busy, draft }) {
  const { conversations, settings, navigate } = useChat();
  const recent = (conversations || []).slice(0, 3);
  const first = (settings.nickname || USER.name).split(" ")[0];

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 pb-10 pt-[6vh] md:pt-[9vh]" data-testid="empty-state">
      <div className="hg-stagger flex w-full flex-col items-center">
        <Orb className="mb-7" />
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-hg-muted">{greeting()}, {first}</p>
        <h1 className="text-center text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-hg-text sm:text-[38px] md:text-[44px]" data-testid="empty-headline">
          Don&rsquo;t trust the answer.
          <br />
          <span className="font-serif font-normal italic tracking-[-0.01em] text-hg-accent">Trace the evidence.</span>
        </h1>
        <p className="mt-4 max-w-md text-center text-[15px] leading-relaxed text-hg-text2">Verify AI-generated claims against evidence you can inspect.</p>
        <div className="mt-9 flex w-full justify-center">
          <VerificationComposer onSend={onSend} busy={busy} variant="hero" initialText={draft} />
        </div>
        <div className="mt-5 w-full max-w-[760px]"><QuickActions onPick={(p) => onSend(p, { mode: "standard", fromQuick: true })} /></div>
        {recent.length > 0 && (
          <section className="mt-12 w-full max-w-[640px]" aria-label="Recent verifications" data-testid="recent-strip">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-hg-muted">Recent verifications</h2>
              <button type="button" onClick={() => navigate("/history")} className="inline-flex items-center gap-1 text-[12px] text-hg-text2 transition-colors hover:text-hg-accent" data-testid="recent-view-all">View all <ArrowUpRight className="h-3 w-3" /></button>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {recent.map((c) => {
                const st = CONV_STATUS[c.status] || CONV_STATUS.reviewing;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => navigate(`/c/${c.id}`)} data-testid={`recent-item-${c.id}`}
                      className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-hg-sunken">
                      <span className="min-w-0 flex-1 truncate text-[14px] text-hg-text">{c.title}</span>
                      <span className="hidden text-[11.5px] text-hg-muted sm:block">{relativeTime(c.updated_at)}</span>
                      <StatusPill verdict={st.verdict} label={c.status === "verified" ? "Supported" : c.status === "needs_correction" ? "Contradicted" : "Insufficient evidence"} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

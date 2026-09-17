"use client";

import { ExternalLink } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { RELATIONSHIPS, VERDICTS } from "@/lib/format";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusPill } from "./StatusPill";

export function SourceDrawer() {
  const { source, setSource } = useChat();
  const rel = source ? RELATIONSHIPS[source.relationship] || RELATIONSHIPS.context : null;
  return (
    <Sheet open={!!source} onOpenChange={(o) => !o && setSource(null)}>
      <SheetContent side="right" className="w-full border-hg-line bg-hg-surface p-0 text-hg-text sm:max-w-[440px]" data-testid="source-drawer">
        {source && (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-hg-line px-6 py-5 text-left">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hg-sunken font-mono text-[12px] font-medium text-hg-text2">{source.source[0]}</span>
                <div className="min-w-0">
                  <SheetTitle className="text-[15px] font-semibold text-hg-text">{source.source}</SheetTitle>
                  <SheetDescription className="text-[12px] text-hg-muted">{source.domain}</SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <section>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-hg-muted">Title</div>
                <p className="mt-1 text-[15px] font-medium text-hg-text">{source.title}</p>
              </section>
              {rel && (
                <section>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-hg-muted">Relationship</div>
                  <div className="mt-1.5"><StatusPill verdict={rel.verdict} label={rel.label} /></div>
                </section>
              )}
              {rel && (
                <section>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-hg-muted">Relevant evidence</div>
                  <blockquote className="mt-2 border-l-2 pl-4 text-[14.5px] leading-relaxed text-hg-text2" style={{ borderColor: VERDICTS[rel.verdict].color }}>“{source.excerpt}”</blockquote>
                </section>
              )}
              {source.conversation_title && (
                <section>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-hg-muted">From verification</div>
                  <p className="mt-1 text-[14px] text-hg-text">{source.conversation_title}</p>
                </section>
              )}
            </div>
            <div className="border-t border-hg-line px-6 py-4">
              <a href={source.url || "#"} target="_blank" rel="noreferrer" data-testid="source-open-link"
                className="inline-flex items-center gap-1.5 rounded-full bg-hg-accent px-4 py-2 text-[13px] font-medium text-white transition-[background-color,transform] hover:bg-hg-accentHover hover:-translate-y-px">
                Open source <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, FileSearch, Zap, X, Square, Mic } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  "Paste an AI-generated answer to verify...",
  "Enter a claim you want to trace...",
  "Ask HalluciGuard to verify an answer...",
];

export function VerificationComposer({ onSend, busy, variant = "hero", initialText = "", onStop }) {
  const { settings } = useChat();
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] = useState([]);
  const [deep, setDeep] = useState(settings.deepVerifyDefault);
  const [evidence, setEvidence] = useState(true);
  const [ph, setPh] = useState(0);
  const ref = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { if (initialText) { setText(initialText); ref.current?.focus(); } }, [initialText]);
  useEffect(() => {
    if (text) return undefined;
    const t = setInterval(() => setPh((p) => (p + 1) % PLACEHOLDERS.length), 4200);
    return () => clearInterval(t);
  }, [text]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  const canSend = text.trim().length > 0 && !busy;
  const submit = () => {
    if (!canSend) return;
    onSend(text.trim(), { mode: deep ? "deep" : "standard", evidence, attachments });
    setText("");
    setAttachments([]);
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && settings.sendWithEnter) { e.preventDefault(); submit(); }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !settings.sendWithEnter) { e.preventDefault(); submit(); }
  };

  return (
    <div className={cn("w-full", variant === "hero" ? "max-w-[760px]" : "max-w-[760px]")}>
      <div
        className={cn("hg-composer relative rounded-[20px] border border-hg-line bg-hg-surface shadow-hg transition-[border-color,box-shadow] duration-200", variant === "hero" ? "min-h-[132px]" : "min-h-[96px]")}
        data-testid="composer"
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {attachments.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-hg-line bg-hg-sunken px-2.5 py-1 text-[11.5px] text-hg-text2" data-testid="attachment-chip">
                <Paperclip className="h-3 w-3" /> <span className="max-w-[140px] truncate">{a.name}</span>
                <button type="button" onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))} aria-label={`Remove ${a.name}`} className="rounded-full hover:text-hg-text"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={PLACEHOLDERS[ph]}
          aria-label="Claim or answer to verify"
          data-testid="composer-textarea"
          className={cn("w-full resize-none bg-transparent px-5 text-[15px] leading-relaxed text-hg-text placeholder:text-hg-muted focus:outline-none", variant === "hero" ? "pt-5" : "pt-4")}
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => {
              const files = Array.from(e.target.files || []).map((f) => ({ id: `${f.name}-${f.size}-${Math.random()}`, name: f.name }));
              setAttachments((p) => [...p, ...files]);
              e.target.value = "";
            }} />
            <button type="button" className="hg-pill" onClick={() => fileRef.current?.click()} data-testid="composer-attach"><Paperclip className="h-3.5 w-3.5" strokeWidth={1.75} /> Attach</button>
            <button type="button" className="hg-pill" data-active={evidence} onClick={() => setEvidence((v) => !v)} aria-pressed={evidence} data-testid="composer-evidence"><FileSearch className="h-3.5 w-3.5" strokeWidth={1.75} /> Evidence</button>
            <button type="button" className="hg-pill" data-active={deep} onClick={() => setDeep((v) => !v)} aria-pressed={deep} data-testid="composer-deep-verify"><Zap className="h-3.5 w-3.5" strokeWidth={1.75} /> Deep Verify</button>
          </div>
          <div className="flex items-center gap-1">
            {settings.dictation && <button type="button" className="hg-icon-btn hidden sm:inline-flex" aria-label="Dictate" data-testid="composer-dictate"><Mic className="h-4 w-4" strokeWidth={1.75} /></button>}
            {busy ? (
              <button type="button" onClick={onStop} aria-label="Stop verification" data-testid="composer-stop"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-hg-text text-hg-bg transition-transform hover:scale-[1.04]"><Square className="h-3.5 w-3.5 fill-current" /></button>
            ) : (
              <button type="button" onClick={submit} disabled={!canSend} aria-label="Verify" data-testid="composer-send"
                className={cn("flex h-9 w-9 items-center justify-center rounded-full text-white transition-[transform,background-color,opacity] duration-150", canSend ? "bg-hg-accent hover:bg-hg-accentHover hover:scale-[1.04] active:scale-95" : "bg-hg-sunken text-hg-muted")}>
                <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
              </button>
            )}
          </div>
        </div>
      </div>
      {variant === "docked" && <p className="mt-2 text-center text-[11px] text-hg-muted">HalluciGuard traces evidence for every answer. Inspect sources before you trust a verdict.</p>}
    </div>
  );
}

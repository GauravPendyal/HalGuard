"use client";

import { useState } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useChat } from "@/context/ChatContext";
import { api } from "@/lib/api";
import { LogoMark } from "@/components/brand/Logo";
import { VerificationStatus } from "./VerificationStatus";
import { CorrectionBlock } from "./CorrectionBlock";
import { EvidenceTrace } from "./EvidenceTrace";
import { ClaimList } from "./ClaimList";
import { AgentActivity } from "./AgentActivity";

export function UserMessage({ message }) {
  return (
    <div className="flex justify-end animate-hg-rise" data-testid="user-message">
      <div className="max-w-[78%] rounded-[16px] bg-hg-sunken px-4 py-3 text-[15px] leading-relaxed text-hg-text">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function HalluciGuardMessage({ message, conversationId, isLast, onRegenerate }) {
  const { settings } = useChat();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(message.feedback || null);
  const v = message.verification;

  const copy = async () => {
    const text = v ? `${message.content}\n\n${v.explanation}${v.correction ? `\n\nCorrection: ${v.correction}` : ""}` : message.content;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const rate = async (type) => {
    const next = feedback === type ? null : type;
    setFeedback(next);
    try { await api.setFeedback(conversationId, message.id, next); } catch { toast.error("Couldn't save feedback"); }
  };

  return (
    <article className="animate-hg-rise" data-testid="assistant-message">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-hg-muted"><LogoMark size={16} /> HalluciGuard</div>
      <div className="hg-prose text-[15.5px] leading-[1.65] text-hg-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
      </div>
      {v && (
        <>
          <VerificationStatus verdict={v.verdict} explanation={v.explanation} />
          {v.correction && <CorrectionBlock original={v.original_claim} correction={v.correction} />}
          {!v.correction && v.claims?.length === 1 && <p className="mt-3 text-[14px] text-hg-text2">Claim traced: “{v.claims[0].text}”</p>}
          <EvidenceTrace evidence={v.evidence} counts={v.counts} />
          <ClaimList claims={v.claims} evidence={v.evidence} />
          <AgentActivity pipeline={v.pipeline} defaultOpen={settings.showPipeline} mode={v.mode} />
        </>
      )}
      <div className="mt-2 flex items-center gap-0.5 text-hg-muted" data-testid="message-actions">
        <button type="button" onClick={copy} className="hg-icon-btn h-7 w-7" aria-label="Copy" data-testid="copy-button">{copied ? <Check className="h-3.5 w-3.5 text-hg-supported" /> : <Copy className="h-3.5 w-3.5" />}</button>
        <button type="button" onClick={() => rate("like")} className={`hg-icon-btn h-7 w-7 ${feedback === "like" ? "text-hg-supported" : ""}`} aria-label="Good verification" aria-pressed={feedback === "like"} data-testid="like-button"><ThumbsUp className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => rate("dislike")} className={`hg-icon-btn h-7 w-7 ${feedback === "dislike" ? "text-hg-contradicted" : ""}`} aria-label="Poor verification" aria-pressed={feedback === "dislike"} data-testid="dislike-button"><ThumbsDown className="h-3.5 w-3.5" /></button>
        {isLast && onRegenerate && <button type="button" onClick={onRegenerate} className="hg-icon-btn h-7 w-7" aria-label="Re-verify" data-testid="regenerate-button"><RotateCcw className="h-3.5 w-3.5" /></button>}
        <span className="ml-2 font-mono text-[10.5px]">{new Date(message.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </article>
  );
}

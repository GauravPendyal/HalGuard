"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { UserMessage, HalluciGuardMessage } from "./Messages";
import { VerificationProgress } from "./VerificationProgress";

export function Conversation({ conversation, pending, stage, error, onRetry, onRegenerate }) {
  const endRef = useRef(null);
  const messages = conversation?.messages || [];
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending, stage, error]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6" data-testid="conversation">
      <div className="mx-auto flex w-full max-w-[720px] flex-col pb-6 pt-4" style={{ gap: `calc(28px * var(--space-y))` }}>
        {messages.map((m) =>
          m.role === "user" ? (
            <UserMessage key={m.id} message={m} />
          ) : (
            <HalluciGuardMessage key={m.id} message={m} conversationId={conversation.id} isLast={m.id === lastAssistant?.id && !pending} onRegenerate={onRegenerate} />
          )
        )}
        {pending && <UserMessage message={{ content: pending }} />}
        {pending && !error && <VerificationProgress stage={stage} />}
        {error && (
          <div className="flex items-start gap-3 rounded-[14px] border px-4 py-3 text-[13.5px] animate-hg-rise" style={{ borderColor: "color-mix(in srgb, var(--contradicted) 25%, transparent)", background: "var(--contradicted-tint)" }} role="alert" data-testid="verification-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-hg-contradicted" />
            <div className="flex-1">
              <div className="font-medium text-hg-text">Verification couldn&rsquo;t complete</div>
              <div className="text-hg-text2">{error}</div>
            </div>
            <button type="button" onClick={onRetry} className="hg-pill" data-testid="retry-button"><RotateCcw className="h-3 w-3" /> Retry</button>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

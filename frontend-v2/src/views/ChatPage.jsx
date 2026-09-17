"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useChat } from "@/context/ChatContext";
import { ChatHeader } from "@/components/shell/ChatHeader";
import { EmptyVerificationState } from "@/components/chat/EmptyVerificationState";
import { Conversation } from "@/components/chat/Conversation";
import { VerificationComposer } from "@/components/chat/VerificationComposer";
import { STAGES } from "@/components/chat/VerificationProgress";
import { Wordmark } from "@/components/brand/Logo";

const MIN_VERIFY_MS = 2600;

export default function ChatPage() {
  const { upsertConversation, settings, activePath, navigate } = useChat();
  
  const id = activePath.startsWith("/c/") ? activePath.replace("/c/", "") : null;

  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(null);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");
  const abortRef = useRef({ cancelled: false });

  useEffect(() => {
    setError(null); setPending(null);
    if (!id) { setConversation(null); return; }
    let alive = true;
    setLoading(true);
    api.getConversation(id)
      .then((c) => { if (alive) setConversation(c); })
      .catch(() => { toast.error("Verification not found"); navigate("/"); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, navigate]);

  useEffect(() => {
    if (!pending || error) return undefined;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 700);
    return () => clearInterval(t);
  }, [pending, error]);

  const send = useCallback(async (text, { mode = "standard" } = {}) => {
    abortRef.current = { cancelled: false };
    const ctrl = abortRef.current;
    let convId = id;
    setError(null);
    try {
      if (!convId) {
        const created = await api.createConversation({ title: text.slice(0, 60) });
        convId = created.id;
        setConversation(created);
        upsertConversation(created);
        navigate(`/c/${created.id}`, { replace: false });
      }
      setPending(text);
      const started = Date.now();
      const res = await api.sendMessage(convId, text, settings.deepVerifyDefault && mode === "standard" ? "deep" : mode);
      const wait = Math.max(0, MIN_VERIFY_MS - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (ctrl.cancelled) return;
      setConversation(res.conversation);
      upsertConversation(res.conversation);
      setPending(null);
      if (settings.notifyCompleted && res.assistant_message?.verification?.verdict === "contradicted") {
        toast("Correction required", { description: "HalluciGuard found a contradicted claim." });
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "The verification service didn't respond. Your claim is kept below so you can retry.");
    }
  }, [id, navigate, upsertConversation, settings.deepVerifyDefault, settings.notifyCompleted]);

  const stop = () => { abortRef.current.cancelled = true; setPending(null); toast("Verification stopped"); };
  const retry = () => { const text = pending; setPending(null); setError(null); send(text); };
  const regenerate = () => {
    const lastUser = [...(conversation?.messages || [])].reverse().find((m) => m.role === "user");
    if (lastUser) send(lastUser.content, { mode: "deep" });
  };

  const showConversation = id && (conversation?.messages?.length > 0 || pending);

  if (!id) {
    return (
      <div className="flex h-full w-full flex-col">
        <ChatHeader><span className="hidden items-center gap-2 text-[13px] text-hg-muted sm:flex"><Wordmark className="text-[13px] text-hg-text2" /><span className="font-mono text-[10.5px] uppercase tracking-[0.1em]">Evidence engine</span></span></ChatHeader>
        <EmptyVerificationState onSend={send} busy={!!pending} draft={draft} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <ChatHeader title={conversation?.title} status={pending ? "reviewing" : conversation?.status} />
      {loading && !conversation ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-hg-muted" data-testid="conversation-loading">Loading verification…</div>
      ) : showConversation ? (
        <Conversation conversation={conversation} pending={pending} stage={stage} error={error} onRetry={retry} onRegenerate={regenerate} />
      ) : (
        <EmptyVerificationState onSend={send} busy={!!pending} draft={draft} />
      )}
      {showConversation && (
        <div className="shrink-0 px-4 pb-4 pt-2 md:px-6">
          <div className="mx-auto flex w-full max-w-[760px] justify-center">
            <VerificationComposer onSend={send} busy={!!pending} onStop={stop} variant="docked" initialText={draft} />
          </div>
        </div>
      )}
      <button type="button" className="hidden" onClick={() => setDraft("")} aria-hidden="true" tabIndex={-1} />
    </div>
  );
}

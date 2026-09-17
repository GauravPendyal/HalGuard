"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { QueryComposer, type ComposerSubmit } from "@/components/verify/QueryComposer";
import { AssistantMessage } from "@/components/verify/AssistantMessage";
import { ErrorState } from "@/components/ui/ErrorState";
import { useVerification } from "@/lib/hooks/useVerification";
import { useAuth } from "@/lib/auth/AuthContext";
import { loadHistory, recordHistory } from "@/lib/history/store";
import { FileSearch, Microscope, Scale, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function VerifyWorkspace({ initialId }: { initialId?: string }) {
  const v = useVerification();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const activeId = initialId || searchParams?.get("id");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recordedFor = useRef<string | null>(null);

  // Load past history entry if initialId or ?id= is specified; reset to clean state if navigating to /app
  useEffect(() => {
    if (activeId) {
      const entries = loadHistory(user?.sub);
      const found = entries.find((e) => e.id === activeId);
      if (found && found.result) {
        recordedFor.current = found.id;
        v.loadPastRun(found.query, found.result);
      }
    } else if (recordedFor.current !== null && !initialId) {
      recordedFor.current = null;
      v.reset();
    }
  }, [activeId, initialId, user?.sub, v.loadPastRun, v.reset]);

  const onSubmit = (query: string, opts: ComposerSubmit) => {
    v.submit(query, { mode: opts.mode, domain: opts.domain, llmResponse: opts.llmResponse });
  };

  // Scroll to bottom when pipeline updates
  useEffect(() => {
    if (v.phase !== "idle" && bottomRef.current) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      bottomRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
    }
  }, [v.phase, v.elapsedMs]);

  // Record each distinct completed run to local history exactly once.
  useEffect(() => {
    if (v.phase === "complete" && v.result) {
      const id = v.result.executionId ?? `${v.query}:${v.result.totalLatencyMs ?? ""}`;
      if (recordedFor.current !== id) {
        recordedFor.current = id;
        recordHistory(user?.sub, v.query, v.result);
      }
    }
    if (v.phase === "idle") recordedFor.current = null;
  }, [v.phase, v.result, v.query, user?.sub]);

  const showPipeline = v.phase === "running" || v.phase === "complete";

  if (v.phase === "idle") {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex h-14 items-center justify-between px-4">
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-lg font-semibold text-text-primary hover:bg-surface-hover">
            HalluciGuard
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <h1 className="mb-8 text-3xl font-semibold text-text-primary">
            Ready when you are.
          </h1>
          
          <div className="w-full max-w-[800px]">
            <QueryComposer
              onSubmit={onSubmit}
              onCancel={v.cancel}
              running={false}
              autoFocus
            />
            
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onSubmit("Can vitamin C cure the common cold?", { mode: "normal", domain: "general", llmResponse: null })}
                className="flex items-center gap-2 rounded-full border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover"
              >
                <Microscope className="h-4 w-4" />
                Check a scientific claim
              </button>
              <button
                onClick={() => onSubmit("What is the capital of Australia?", { mode: "normal", domain: "general", llmResponse: null })}
                className="flex items-center gap-2 rounded-full border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover"
              >
                <FileSearch className="h-4 w-4" />
                Test fact retrieval
              </button>
              <button
                onClick={() => onSubmit("Is it legal to turn right on red everywhere in the US?", { mode: "normal", domain: "general", llmResponse: null })}
                className="flex items-center gap-2 rounded-full border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover"
              >
                <Scale className="h-4 w-4" />
                Verify a legal question
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-lg font-semibold text-text-primary hover:bg-surface-hover">
          HalluciGuard
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto w-full max-w-[800px] pt-8">
          {/* User's query bubble */}
          <div className="mb-6 flex justify-end">
            <div className="max-w-[80%] rounded-3xl bg-surface-tertiary px-5 py-3 text-[15px] leading-relaxed text-text-primary">
              {v.query}
            </div>
          </div>

          {v.phase === "error" && v.error && (
            <div className="mb-8">
              <ErrorState
                title={v.error.title}
                description={v.error.description}
                detail={v.error.detail}
                onRetry={v.retry}
              />
            </div>
          )}

          {showPipeline && (
            <div className="flex flex-col gap-8 pb-8">
              <AssistantMessage phase={v.phase} elapsedMs={v.elapsedMs} result={v.result} />
            </div>
          )}
          
          <div ref={bottomRef} className="h-32" />
        </div>
      </div>

      {/* Pinned composer at the bottom */}
      <div className="w-full bg-background pb-6 pt-2">
        <div className="mx-auto w-full max-w-[800px] px-4">
          <QueryComposer
            onSubmit={onSubmit}
            onCancel={v.cancel}
            running={v.phase === "running"}
          />
          <p className="mt-2 text-center text-[12px] text-text-muted">
            HalluciGuard can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}

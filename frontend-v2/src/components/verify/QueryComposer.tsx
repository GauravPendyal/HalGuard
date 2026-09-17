"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, Mic, BrainCircuit, Square } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { GenerationMode } from "@/lib/api/types";
import { Tooltip } from "@/components/ui/Tooltip";

export interface ComposerSubmit {
  mode: GenerationMode;
  domain: string;
  llmResponse: string | null;
}

export function QueryComposer({
  onSubmit,
  onCancel,
  running,
  autoFocus,
  className,
}: {
  onSubmit: (query: string, opts: ComposerSubmit) => void;
  onCancel?: () => void;
  running?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<GenerationMode>("normal");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = query.trim().length > 0 && !running;

  const doSubmit = () => {
    if (!canSubmit) return;
    onSubmit(query.trim(), {
      mode,
      domain: "general", // ChatGPT-like doesn't expose domain immediately
      llmResponse: null,
    });
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSubmit();
    }
  };

  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  };

  const toggleThink = () => {
    setMode(mode === "normal" ? "stress_test" : "normal");
  };

  return (
    <div className={cn("relative flex w-full flex-col", className)}>
      <div className="relative flex min-h-[52px] w-full items-center rounded-3xl bg-surface-secondary px-3 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.1)] focus-within:ring-2 focus-within:ring-signal/30">
        
        {/* Attach button */}
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text-primary"
          aria-label="Attach file or add context"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Input */}
        <textarea
          ref={taRef}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            autoGrow();
          }}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask anything"
          className="mx-2 max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted"
          style={{ minHeight: "24px" }}
        />

        {/* Right side controls */}
        <div className="flex shrink-0 items-center gap-1.5 self-end pb-0.5">
          <Tooltip content="Toggle advanced reasoning (Stress test mode)">
            <button
              type="button"
              onClick={toggleThink}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
                mode === "stress_test" 
                  ? "bg-surface-tertiary text-text-primary" 
                  : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <BrainCircuit className="h-4 w-4" />
              Think
            </button>
          </Tooltip>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text-primary"
            aria-label="Voice input"
          >
            <Mic className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={running ? onCancel : doSubmit}
            disabled={!canSubmit && !running}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              running 
                ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                : canSubmit 
                  ? "bg-signal text-white hover:bg-signal-hover" 
                  : "bg-surface-tertiary text-text-muted"
            )}
            aria-label={running ? "Stop generation" : "Send message"}
          >
            {running ? (
              <Square className="h-3 w-3 fill-current" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

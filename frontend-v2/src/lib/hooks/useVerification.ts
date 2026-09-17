"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runVerification, createRequest } from "@/lib/api/verify";
import { ApiError } from "@/lib/api/client";
import { classifyUserIntent } from "@/lib/guard/intent";
import type { GenerationMode, VerificationResult } from "@/lib/api/types";

export type VerifyPhase = "idle" | "running" | "complete" | "error";

export interface VerifyErrorInfo {
  title: string;
  description: string;
  detail?: string;
}

export interface SubmitOptions {
  mode?: GenerationMode;
  llmResponse?: string | null;
  domain?: string;
}

interface VerifyState {
  phase: VerifyPhase;
  /** Wall-clock elapsed since submit (ms) — a real measurement, not a fabricated per-stage progress. */
  elapsedMs: number;
  result: VerificationResult | null;
  error: VerifyErrorInfo | null;
  query: string;
}

function describeError(err: unknown): VerifyErrorInfo {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case "timeout":
        return {
          title: "Verification timed out",
          description:
            "The service didn't return in time. Long-running retrieval can occasionally exceed the limit — try again, or simplify the claim.",
          detail: err.technical,
        };
      case "network":
        return {
          title: "Can't reach the verification service",
          description:
            "The request didn't get through. Check that the backend URL is reachable and that its CORS settings allow this origin.",
          detail: err.technical,
        };
      case "http":
        return {
          title: "The service rejected the request",
          description:
            "The verification backend responded with an error. The technical detail below is straight from the service.",
          detail: err.technical,
        };
      case "parse":
        return {
          title: "Unreadable response",
          description:
            "The service replied, but the response wasn't valid JSON in the expected shape.",
          detail: err.technical,
        };
    }
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return { title: "Verification cancelled", description: "You stopped the run before it completed." };
  }
  return {
    title: "Something interrupted the verification",
    description: err instanceof Error ? err.message : "An unexpected error occurred.",
  };
}

export function useVerification() {
  const [state, setState] = useState<VerifyState>({
    phase: "idle",
    elapsedMs: 0,
    result: null,
    error: null,
    query: "",
  });

  const abortRef = useRef<AbortController | null>(null);
  const startRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const lastArgs = useRef<{ query: string; opts?: SubmitOptions } | null>(null);

  const stopTicking = useCallback(() => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const submit = useCallback(
    async (query: string, opts?: SubmitOptions) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      // Cancel any in-flight run before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      lastArgs.current = { query: trimmed, opts };

      // Check conversational intent / greetings BEFORE calling /verify backend
      const intent = classifyUserIntent(trimmed);
      if (intent.isConversational) {
        stopTicking();
        const convText = intent.response || "Hello! What factual claim would you like me to verify?";
        const conversationalResult: VerificationResult = {
          executionId: `conv-${Date.now()}`,
          requestId: `conv-${Date.now()}`,
          answer: {
            model: "HalluciGuard Assistant",
            draft: convText,
            final: convText,
          },
          verificationStatus: null,
          terminalStatus: "completed",
          overallVerdict: null,
          overallConfidence: 1.0,
          detector: null,
          verifierSkipped: true,
          retrieval: null,
          runtimeModels: null,
          claims: [],
          stages: [],
          trace: [],
          totalLatencyMs: 15,
          activeAgents: ["assistant"],
          disabledAgents: ["verifier", "retrieval"],
          errors: [],
          raw: {} as any,
        };

        setState({
          phase: "complete",
          elapsedMs: 15,
          result: conversationalResult,
          error: null,
          query: trimmed,
        });
        return;
      }

      startRef.current = Date.now();
      setState({ phase: "running", elapsedMs: 0, result: null, error: null, query: trimmed });

      stopTicking();
      tickRef.current = window.setInterval(() => {
        setState((s) => (s.phase === "running" ? { ...s, elapsedMs: Date.now() - startRef.current } : s));
      }, 100);

      try {
        const result = await runVerification(createRequest(trimmed, opts), controller.signal);
        if (controller.signal.aborted) return;
        stopTicking();
        setState((s) => ({
          ...s,
          phase: "complete",
          elapsedMs: Date.now() - startRef.current,
          result,
          error: null,
        }));
      } catch (err) {
        if (controller.signal.aborted && !(err instanceof ApiError)) {
          // Deliberate cancel — return to idle quietly.
          stopTicking();
          setState((s) => ({ ...s, phase: "idle", elapsedMs: 0 }));
          return;
        }
        stopTicking();
        setState((s) => ({ ...s, phase: "error", error: describeError(err) }));
      }
    },
    [stopTicking],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    stopTicking();
    setState((s) => ({ ...s, phase: "idle", elapsedMs: 0 }));
  }, [stopTicking]);

  const retry = useCallback(() => {
    if (lastArgs.current) void submit(lastArgs.current.query, lastArgs.current.opts);
  }, [submit]);

  const loadPastRun = useCallback((query: string, result: VerificationResult) => {
    abortRef.current?.abort();
    stopTicking();
    setState({
      phase: "complete",
      elapsedMs: result.totalLatencyMs || 0,
      result,
      error: null,
      query,
    });
  }, [stopTicking]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    stopTicking();
    setState({ phase: "idle", elapsedMs: 0, result: null, error: null, query: "" });
  }, [stopTicking]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopTicking();
    };
  }, [stopTicking]);

  return {
    phase: state.phase,
    elapsedMs: state.elapsedMs,
    result: state.result,
    error: state.error,
    query: state.query,
    submit,
    loadPastRun,
    cancel,
    retry,
    reset,
  };
}

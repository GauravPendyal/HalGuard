"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { History, ArrowLeft, Trash2, ShieldCheck, Info } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { HistoryList } from "@/components/history/HistoryList";
import { ResultView } from "@/components/results/ResultView";
import {
  loadHistory,
  removeHistoryEntry,
  clearHistory,
  type HistoryEntry,
} from "@/lib/history/store";

export function HistoryView() {
  const { user, status } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // History is per-identity; reload whenever the signed-in user changes.
  useEffect(() => {
    setEntries(loadHistory(user?.sub));
    setActiveId(null);
    setHydrated(true);
  }, [user?.sub]);

  const active = activeId ? entries.find((e) => e.id === activeId) ?? null : null;

  const handleRemove = useCallback(
    (id: string) => {
      const next = removeHistoryEntry(user?.sub, id);
      setEntries(next);
      setActiveId((cur) => (cur === id ? null : cur));
      toast({ title: "Removed from history", variant: "info" });
    },
    [user?.sub, toast],
  );

  const handleClear = useCallback(() => {
    clearHistory(user?.sub);
    setEntries([]);
    setActiveId(null);
    setConfirmClear(false);
    toast({ title: "History cleared", variant: "info" });
  }, [user?.sub, toast]);

  // ---- Detail mode ----
  if (active) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <button
          onClick={() => setActiveId(null)}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to history
        </button>

        <div className="mt-4 rounded-lg border border-line bg-panel px-4 py-3">
          <span className="hg-eyebrow">Verified claim</span>
          <p className="mt-1 text-[15px] leading-snug text-ink">{active.query}</p>
          <p className="mt-1 text-[11.5px] text-ink-dim">
            {new Date(active.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="mt-8">
          <ResultView result={active.result} />
        </div>
      </div>
    );
  }

  // ---- List mode ----
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="hg-eyebrow inline-flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Verification history
          </span>
          <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
            {entries.length > 0
              ? `${entries.length} recent verification${entries.length === 1 ? "" : "s"}`
              : "Verification history"}
          </h1>
        </div>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear all
          </Button>
        )}
      </header>

      {/* Honest scope note */}
      <p className="mb-6 flex items-start gap-2 rounded-md border border-line bg-panel-inset px-3 py-2 text-[12.5px] leading-relaxed text-ink-dim">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
        <span>
          History is stored only in this browser — never on a server.
          {status === "authenticated"
            ? " It's tied to your account on this device."
            : " Sign in to keep a separate history tied to your account."}
        </span>
      </p>

      {!hydrated ? null : entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="No verifications yet"
          description="Run a verification and it'll appear here, ready to reopen with its full evidence and trace intact."
          action={
            <Link href="/app">
              <Button variant="primary" size="md">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Verify a claim
              </Button>
            </Link>
          }
        />
      ) : (
        <HistoryList entries={entries} onOpen={setActiveId} onRemove={handleRemove} />
      )}

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all history?"
        description="This permanently removes every saved verification from this browser. It can't be undone."
      >
        <div className="flex justify-end gap-2.5 pt-1">
          <Button variant="secondary" size="md" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={handleClear}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Local verification history.
 *
 * History lives entirely in the browser (localStorage) — it is never sent
 * anywhere. Entries are scoped per identity: a signed-in user's runs are keyed
 * by their Google `sub`, anonymous runs by "anon". Signing in or out simply
 * switches which bucket is shown; nothing is silently merged or exfiltrated.
 *
 * We keep the full VerificationResult so a past run can be re-opened exactly as
 * it was returned — but cap the list and fail safe on quota so a large payload
 * can never wedge the app.
 */

import type { VerificationResult, Verdict } from "@/lib/api/types";

const PREFIX = "hg.history.v1.";
const MAX_ENTRIES = 25;

export interface HistoryEntry {
  id: string;
  query: string;
  createdAt: number;
  overallVerdict: Verdict | null;
  verificationStatus: string | null;
  claimCount: number;
  verifierSkipped: boolean;
  totalLatencyMs: number | null;
  result: VerificationResult;
}

function keyFor(userId: string | null | undefined): string {
  return PREFIX + (userId && userId.trim() ? userId : "anon");
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadHistory(userId: string | null | undefined): HistoryEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

function persist(userId: string | null | undefined, entries: HistoryEntry[]): HistoryEntry[] {
  if (!canUseStorage()) return entries;
  let toStore = entries.slice(0, MAX_ENTRIES);
  // Fail safe on quota: shed oldest entries until it fits (or give up quietly).
  for (let attempt = 0; attempt < toStore.length; attempt++) {
    try {
      window.localStorage.setItem(keyFor(userId), JSON.stringify(toStore));
      window.dispatchEvent(new Event("hg-history-updated"));
      return toStore;
    } catch {
      toStore = toStore.slice(0, Math.max(1, toStore.length - 3));
    }
  }
  return toStore;
}

/**
 * Record a completed verification. Returns the updated list. De-dupes by
 * executionId so a retry of the same run doesn't stack duplicates.
 */
export function recordHistory(
  userId: string | null | undefined,
  query: string,
  result: VerificationResult,
): HistoryEntry[] {
  if (!canUseStorage()) return [];
  const id = result.executionId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: HistoryEntry = {
    id,
    query,
    createdAt: Date.now(),
    overallVerdict: result.overallVerdict,
    verificationStatus: result.verificationStatus,
    claimCount: result.claims.length,
    verifierSkipped: result.verifierSkipped,
    totalLatencyMs: result.totalLatencyMs,
    result,
  };
  const existing = loadHistory(userId).filter((e) => e.id !== id);
  return persist(userId, [entry, ...existing]);
}

export function removeHistoryEntry(userId: string | null | undefined, id: string): HistoryEntry[] {
  const next = loadHistory(userId).filter((e) => e.id !== id);
  return persist(userId, next);
}

export function clearHistory(userId: string | null | undefined): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(keyFor(userId));
  } catch {
    /* ignore */
  }
}

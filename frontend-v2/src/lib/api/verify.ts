/**
 * verify.ts — the public verification entry point used by the UI.
 *
 * Components call `runVerification` and receive a fully-mapped VerificationResult.
 * This is where the dev-only mock is selected (never in production) and where the
 * raw payload is handed to the mapper. There is exactly one real network path.
 */

import { config } from "@/lib/config";
import { postVerify } from "@/lib/api/client";
import { mapVerification } from "@/lib/api/map";
import { mockFor } from "@/lib/api/mock";
import type {
  GenerationMode,
  VerificationRequest,
  VerificationResult,
} from "@/lib/api/types";

function makeRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRequest(
  userQuery: string,
  opts?: {
    mode?: GenerationMode;
    llmResponse?: string | null;
    domain?: string;
  },
): VerificationRequest {
  return {
    user_query: userQuery,
    generation_mode: opts?.mode ?? "normal",
    llm_response: opts?.llmResponse ?? null,
    conversation_history: [],
    domain: opts?.domain?.trim() || "general",
    request_id: makeRequestId(),
  };
}

export async function runVerification(
  request: VerificationRequest,
  signal?: AbortSignal,
): Promise<VerificationResult> {
  if (config.mockEnabled) {
    // Simulate a realistic round-trip so loading states are exercised in dev.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 900);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
    return mapVerification(mockFor(request.user_query));
  }

  const raw = await postVerify(request, signal);
  return mapVerification(raw);
}

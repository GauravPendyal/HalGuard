/**
 * verify.ts — the public verification entry point used by the UI.
 *
 * Components call `runVerification` and receive a fully-mapped VerificationResult.
 * The raw backend payload is handed to the mapper. There is exactly one real
 * network path and no browser-side mock verification mode.
 */

import { postVerify } from "@/lib/api/client";
import { mapVerification } from "@/lib/api/map";
import type {
  ConversationTurn,
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
    conversationHistory?: ConversationTurn[];
  },
): VerificationRequest {
  return {
    user_query: userQuery,
    generation_mode: opts?.mode ?? "normal",
    llm_response: opts?.llmResponse ?? null,
    conversation_history: opts?.conversationHistory ?? [],
    domain: opts?.domain?.trim() || "general",
    request_id: makeRequestId(),
  };
}

export async function runVerification(
  request: VerificationRequest,
  signal?: AbortSignal,
  token?: string | null,
): Promise<VerificationResult> {
  const raw = await postVerify(request, signal, token);
  return mapVerification(raw);
}

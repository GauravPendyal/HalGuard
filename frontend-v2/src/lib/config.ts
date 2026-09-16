/**
 * Runtime configuration, sourced entirely from public environment variables.
 *
 * Everything here is browser-exposed by design (NEXT_PUBLIC_*). No secret — the
 * OAuth client secret, OpenRouter / Tavily / n8n / NVD keys, or server JWT secret
 * belongs in this file or anywhere in the client bundle. Production requests use
 * same-origin Next.js route handlers; Google sign-in only needs a public client ID.
 */

function readString(value: string | undefined, fallback: string): string {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : fallback;
}

function readNumber(value: string | undefined, fallback: number): number {
  const n = Number((value ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readBool(value: string | undefined, fallback: boolean): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return fallback;
}

function getApiBaseUrl(): string {
  // 1. If explicit non-localhost URL is provided via environment
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
  if (raw && !raw.includes("localhost") && !raw.includes("127.0.0.1")) {
    return raw;
  }
  // 2. In browser environment outside localhost (e.g. mobile phone visiting vercel)
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocalhost) {
      // Use same-origin route handlers, which proxy to the FastAPI backend.
      return "";
    }
  }
  // 3. Fallback for local development on PC
  return raw || "http://localhost:8000";
}

export const config = {
  /** Base URL of the FastAPI backend. Empty string in production for same-origin proxy. */
  apiBaseUrl: getApiBaseUrl(),

  /** Verification can be slow (retrieval + rerank + NLI). Give it room. */
  apiTimeoutMs: readNumber(process.env.NEXT_PUBLIC_API_TIMEOUT_MS, 120_000),

  /**
   * Google OAuth public client ID. When blank, sign-in is disabled gracefully
   * and the whole product still works anonymously — never a broken button.
   */
  googleClientId: readString(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, ""),

  isProduction: process.env.NODE_ENV === "production",
} as const;

export const authEnabled = true;

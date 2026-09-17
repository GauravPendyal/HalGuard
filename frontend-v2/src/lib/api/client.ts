/**
 * client.ts — the single HTTP boundary to the HalluciGuard FastAPI backend.
 */

import { config } from "@/lib/config";
import type { RawVerificationResponse, VerificationRequest } from "@/lib/api/types";

export type ApiErrorKind = "timeout" | "network" | "http" | "parse" | "auth";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  detail?: string;

  constructor(kind: ApiErrorKind, message: string, opts?: { status?: number; detail?: string }) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = opts?.status;
    this.detail = opts?.detail;
  }

  get technical(): string {
    const bits = [this.kind.toUpperCase()];
    if (this.status != null) bits.push(`HTTP ${this.status}`);
    if (this.detail) bits.push(this.detail);
    return bits.join(" · ");
  }
}

function joinUrl(base: string, path: string): string {
  if (!base || base === "/") return path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

const AUTH_TOKEN_KEY = "hg.auth.jwt.v1";

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

async function readErrorDetail(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text();
    if (!text) return undefined;
    try {
      const json = JSON.parse(text) as { detail?: unknown; message?: unknown };
      const d = json.detail ?? json.message;
      if (typeof d === "string") return d;
      return text.slice(0, 300);
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    return undefined;
  }
}

/** POST the request to /verify and return the RAW payload (unmapped). */
export async function postVerify(
  request: VerificationRequest,
  signal?: AbortSignal,
  token?: string | null,
): Promise<RawVerificationResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.apiTimeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const authToken = token !== undefined ? token : getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(joinUrl(config.apiBaseUrl, "/verify"), {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
      credentials: "omit",
      mode: "cors",
    });
  } catch (err) {
    window.clearTimeout(timeout);
    if (controller.signal.aborted) {
      throw new ApiError(
        "timeout",
        `The verification didn't return within ${Math.round(config.apiTimeoutMs / 1000)}s.`,
      );
    }
    throw new ApiError(
      "network",
      "Couldn't reach the verification service.",
      { detail: err instanceof Error ? err.message : undefined },
    );
  }
  window.clearTimeout(timeout);

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiError("http", `The verification service returned an error.`, {
      status: res.status,
      detail,
    });
  }

  try {
    return (await res.json()) as RawVerificationResponse;
  } catch {
    throw new ApiError("parse", "The verification service returned a response we couldn't read.");
  }
}

/** Lightweight health probe. Returns null on any failure (never throws). */
export async function checkHealth(deep = false): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(joinUrl(config.apiBaseUrl, `/health?deep=${deep}`), {
      credentials: "omit",
      mode: "cors",
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Auth API Calls ──────────────────────────────────────────────────

export interface AuthApiResponse {
  status: string;
  access_token?: string;
  token_type?: string;
  user?: {
    id: string;
    sub: string;
    email: string;
    name: string;
    picture?: string;
    created_at?: string;
  };
}

export async function apiGoogleAuth(credential: string): Promise<AuthApiResponse> {
  const res = await fetch("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ credential }),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiError("auth", detail || "Google authentication failed", { status: res.status, detail });
  }
  return (await res.json()) as AuthApiResponse;
}

export async function apiLogin(email: string, password: string): Promise<AuthApiResponse> {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiError("auth", detail || "Invalid email or password", { status: res.status, detail });
  }
  return (await res.json()) as AuthApiResponse;
}

export async function apiRegister(email: string, password: string, name?: string): Promise<AuthApiResponse> {
  const res = await fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password, name }),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiError("auth", detail || "Registration failed", { status: res.status, detail });
  }
  return (await res.json()) as AuthApiResponse;
}

export async function apiGetMe(token: string): Promise<AuthApiResponse> {
  const res = await fetch("/auth/me", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "same-origin",
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiError("auth", detail || "Session expired", { status: res.status, detail });
  }
  return (await res.json()) as AuthApiResponse;
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    /* ignore */
  }
}

export async function apiGetHistory(token: string): Promise<any[]> {
  try {
    const res = await fetch("/api/history", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "same-origin",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch {
    return [];
  }
}

export async function apiSaveHistory(token: string, query: string, result: any): Promise<void> {
  try {
    await fetch("/api/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, result }),
      credentials: "same-origin",
    });
  } catch {
    /* ignore */
  }
}

export async function apiDeleteHistory(token: string, historyId?: string): Promise<void> {
  try {
    const url = historyId ? `/api/history?history_id=${encodeURIComponent(historyId)}` : "/api/history";
    await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "same-origin",
    });
  } catch {
    /* ignore */
  }
}

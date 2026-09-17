/**
 * Google Identity Services — client-only helpers.
 *
 * We use the Identity Services "ID token" flow: Google returns a signed JWT
 * credential which we decode client-side to read the user's public profile
 * (name, email, picture). This needs only a public client ID — no client secret,
 * no server round-trip, nothing private in the bundle.
 *
 * The decoded profile is used purely for personalization and local history.
 * We do not claim a server-side account; we never mint our own session tokens.
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";

export interface GoogleProfile {
  /** Google subject id — stable per user, used to scope local history. */
  sub: string;
  name: string;
  email: string;
  emailVerified: boolean;
  picture: string;
  /** JWT expiry (epoch seconds). */
  exp: number;
}

/** Minimal shape of the Identity Services global we rely on. */
interface GisCredentialResponse {
  credential: string;
}

interface GisIdApi {
  initialize(cfg: {
    client_id: string;
    callback: (res: GisCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: Record<string, unknown>,
  ): void;
  prompt(): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GisIdApi } };
  }
}

let scriptPromise: Promise<GisIdApi> | null = null;

/** Load the GIS script once; resolve with the id API. Rejects if unavailable. */
export function loadGis(): Promise<GisIdApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GIS unavailable during SSR"));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GisIdApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    const onReady = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error("Google Identity Services failed to initialize"));
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services")),
      );
      // If it already loaded before we attached, resolve on next tick.
      if (window.google?.accounts?.id) onReady();
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = onReady;
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });

  return scriptPromise;
}

/** Decode a JWT payload (no verification — display only). Returns null on garbage. */
export function decodeProfile(credential: string): GoogleProfile | null {
  try {
    const payload = credential.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(
      decodeURIComponent(
        json
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      ),
    ) as Record<string, unknown>;

    if (typeof data.sub !== "string") return null;
    return {
      sub: data.sub,
      name: typeof data.name === "string" ? data.name : "",
      email: typeof data.email === "string" ? data.email : "",
      emailVerified: data.email_verified === true,
      picture: typeof data.picture === "string" ? data.picture : "",
      exp: typeof data.exp === "number" ? data.exp : 0,
    };
  } catch {
    return null;
  }
}

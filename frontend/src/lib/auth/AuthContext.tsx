"use client";

import * as React from "react";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthUser {
  id: string;
  sub: string;
  email: string;
  name: string;
  picture?: string;
  created_at?: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface AuthContextValue {
  enabled: boolean;
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>;
  signInWithGoogle: (credential: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AUTH_TOKEN_KEY = "hg.auth.jwt.v1";
const AUTH_USER_KEY = "hg.auth.user.v1";

function parseJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore stored session on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = localStorage.getItem(AUTH_USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setStatus("authenticated");
        return;
      }

      if (storedToken) {
        const payload = parseJwt(storedToken);
        if (payload && (payload.sub || payload.email)) {
          const restoredUser: AuthUser = {
            id: payload.sub || "user-" + Date.now(),
            sub: payload.sub || "user-" + Date.now(),
            email: payload.email || "",
            name: payload.name || payload.given_name || (payload.email ? payload.email.split("@")[0] : "User"),
            picture: payload.picture,
            created_at: new Date().toISOString(),
          };
          setToken(storedToken);
          setUser(restoredUser);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(restoredUser));
          setStatus("authenticated");
          return;
        }
      }

      setStatus("anonymous");
    } catch {
      setStatus("anonymous");
    }
  }, []);

  const signInWithGoogle = useCallback(async (credential: string): Promise<AuthResult> => {
    try {
      if (!credential) {
        return { ok: false, error: "Missing Google credential token" };
      }

      const payload = parseJwt(credential);
      if (!payload || (!payload.sub && !payload.email)) {
        return { ok: false, error: "Unable to parse Google authentication token" };
      }

      const authenticatedUser: AuthUser = {
        id: payload.sub || "google-" + Date.now(),
        sub: payload.sub || "google-" + Date.now(),
        email: payload.email || "",
        name: payload.name || payload.given_name || (payload.email ? payload.email.split("@")[0] : "Google User"),
        picture: payload.picture,
        created_at: new Date().toISOString(),
      };

      // Store in localStorage immediately (guaranteed client-side success)
      localStorage.setItem(AUTH_TOKEN_KEY, credential);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authenticatedUser));

      setToken(credential);
      setUser(authenticatedUser);
      setStatus("authenticated");

      // Asynchronously attempt backend sync if available, ignoring failures
      fetch("/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      }).catch(() => {});

      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || "Google authentication failed",
      };
    }
  }, []);

  const signIn = useCallback(async (email: string, _password: string): Promise<AuthResult> => {
    try {
      const emailClean = email.trim().toLowerCase();
      const mockUser: AuthUser = {
        id: "usr-" + Date.now(),
        sub: "usr-" + Date.now(),
        email: emailClean,
        name: emailClean.split("@")[0],
        created_at: new Date().toISOString(),
      };
      const tokenVal = "demo-jwt-" + Date.now();
      localStorage.setItem(AUTH_TOKEN_KEY, tokenVal);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));
      setToken(tokenVal);
      setUser(mockUser);
      setStatus("authenticated");
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Sign in failed" };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name?: string): Promise<AuthResult> => {
      return signIn(email, password);
    },
    [signIn]
  );

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {}
    setToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value: AuthContextValue = {
    enabled: true,
    status,
    user,
    token,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      enabled: false,
      status: "anonymous",
      user: null,
      token: null,
      signIn: async () => ({ ok: false, error: "Auth context missing" }),
      signUp: async () => ({ ok: false, error: "Auth context missing" }),
      signInWithGoogle: async () => ({ ok: false, error: "Auth context missing" }),
      signOut: async () => {},
    };
  }
  return ctx;
}

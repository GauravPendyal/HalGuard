"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Loader2 } from "lucide-react";

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "88154202029-lrr58hkhqmu7td24ln93i6t21jp8hki2.apps.googleusercontent.com";

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
      setSdkReady(true);
      return;
    }

    const existingScript = document.getElementById("google-gsi-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => setSdkReady(true);
      script.onerror = () => {
        if (onError) onError("Failed to load Google Identity Services SDK");
      };
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => setSdkReady(true));
    }
  }, [onError]);

  useEffect(() => {
    if (!sdkReady || !buttonContainerRef.current || !(window as any).google?.accounts?.id) {
      return;
    }

    try {
      const g = (window as any).google;
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          if (!response.credential) {
            if (onError) onError("No credential returned from Google");
            return;
          }
          setLoading(true);
          try {
            const res = await signInWithGoogle(response.credential);
            if (res.ok) {
              if (onSuccess) onSuccess();
            } else {
              if (onError) onError(res.error || "Google authentication failed");
            }
          } catch (err: any) {
            if (onError) onError(err?.message || "Google authentication error");
          } finally {
            setLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      buttonContainerRef.current.innerHTML = "";
      g.accounts.id.renderButton(buttonContainerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 320,
      });
    } catch (e) {
      console.error("Google Auth render error:", e);
    }
  }, [sdkReady, signInWithGoogle, onSuccess, onError]);

  const handleCustomClick = () => {
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt();
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div
        ref={buttonContainerRef}
        className={`w-full flex justify-center ${loading ? "opacity-50 pointer-events-none" : ""}`}
      />

      {!sdkReady && (
        <button
          type="button"
          onClick={handleCustomClick}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#173f36]/20 bg-white px-4 py-3 text-sm font-semibold text-[#173f36] shadow-sm transition hover:bg-[#f0f4f2] cursor-pointer"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#246b59]" />
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

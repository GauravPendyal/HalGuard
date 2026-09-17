"use client";

import { useEffect, useId, useState } from "react";
import { AlertCircle, ArrowRight, Loader2, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useAuth } from "@/lib/auth/AuthContext";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const router = useRouter();
  const { status, signIn, signUp, user } = useAuth();
  const titleId = useId();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const enterWorkspace = () => {
    onClose();
    router.push("/chat");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const result =
        mode === "signin"
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, name.trim());
      if (!result.ok) {
        setErrorMessage(result.error || "Authentication failed");
        return;
      }
      enterWorkspace();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="auth-overlay fixed inset-0 z-[999999] grid place-items-center bg-[#102d27]/60 px-4 py-8 backdrop-blur-md"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(16, 45, 39, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "16px",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="auth-modal-card relative w-full max-w-md rounded-[28px] border border-[#173f36]/15 bg-[#fbfaf6] p-6 text-[#173f36] shadow-2xl sm:p-8"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "440px",
          borderRadius: "24px",
          backgroundColor: "#fbfaf6",
          border: "1px solid rgba(23, 63, 54, 0.18)",
          boxShadow: "0 25px 60px -15px rgba(10, 35, 29, 0.45)",
          padding: "32px 28px",
          color: "#173f36",
          boxSizing: "border-box",
          zIndex: 1000000,
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close authentication"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-[#62716c] transition hover:bg-[#e7efeb] hover:text-[#173f36] cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dceae1]">
            <ShieldCheck className="h-6 w-6 text-[#173f36]" />
          </span>
          <div>
            <h2 id={titleId} className="text-xl font-semibold tracking-tight text-[#173f36]">
              Enter HalluciGuard
            </h2>
            <p className="mt-1 text-sm text-[#62716c]">
              Continue to the AI Chat Workspace
            </p>
          </div>
        </div>

        {status === "authenticated" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#173f36]/10 bg-white p-4">
              <p className="text-xs text-[#62716c]">Signed in as</p>
              <p className="text-sm font-semibold text-[#173f36]">{user?.name || user?.email}</p>
              <p className="text-xs text-[#7a8883]">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={enterWorkspace}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246b59] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d594b] cursor-pointer"
            >
              Open Chat Workspace <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <GoogleSignInButton onSuccess={enterWorkspace} onError={setErrorMessage} />
            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-[#173f36]/12" />
              <span className="absolute bg-[#fbfaf6] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8883]">
                or use email
              </span>
            </div>
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-[#e9efec] p-1">
              {(["signin", "signup"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    setErrorMessage(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                    mode === item
                      ? "bg-white text-[#173f36] shadow-sm"
                      : "text-[#697872]"
                  }`}
                >
                  {item === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
            {errorMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300/60 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}
              </div>
            )}
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <label className="block text-xs font-semibold text-[#52645e]">
                  Full name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    className="mt-1.5 w-full rounded-xl border border-[#173f36]/14 bg-white px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#318a72]"
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="block text-xs font-semibold text-[#52645e]">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-[#173f36]/14 bg-white px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#318a72]"
                  autoComplete="email"
                />
              </label>
              <label className="block text-xs font-semibold text-[#52645e]">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="mt-1.5 w-full rounded-xl border border-[#173f36]/14 bg-white px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#318a72]"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246b59] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d594b] disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "signin" ? "Sign in" : "Create account"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-[#173f36]/10" />
              <span className="absolute bg-[#fbfaf6] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8883]">
                or explore directly
              </span>
            </div>
            <button
              type="button"
              onClick={enterWorkspace}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#246b59]/30 bg-[#eef5f1] px-4 py-2.5 text-xs font-semibold text-[#173f36] transition hover:bg-[#dceae1] cursor-pointer"
            >
              Continue to Chat UI as Guest <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </section>
    </div>

  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { AlertCircle, ArrowRight, Loader2, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/lib/auth/AuthContext";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const router = useRouter();
  const { status, signIn, signUp } = useAuth();
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

  const enterWorkspace = () => router.push("/app");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const result = mode === "signin"
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
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#102d27]/35 px-4 py-8 backdrop-blur-md" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-md rounded-[28px] border border-[#173f36]/15 bg-[#fbfaf6] p-6 text-[#173f36] shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" aria-label="Close authentication" onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 text-[#62716c] transition hover:bg-[#e7efeb] hover:text-[#173f36]"><X className="h-5 w-5" /></button>
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dceae1]"><ShieldCheck className="h-6 w-6" /></span>
          <div><h2 id={titleId} className="text-xl font-semibold tracking-tight text-[#173f36]">Enter HalluciGuard</h2><p className="mt-1 text-sm text-[#62716c]">Your model credentials remain on the server.</p></div>
        </div>
        {status === "authenticated" ? (
          <button type="button" onClick={enterWorkspace} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246b59] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d594b]">Open workspace <ArrowRight className="h-4 w-4" /></button>
        ) : (
          <>
            <GoogleSignInButton onSuccess={enterWorkspace} onError={setErrorMessage} />
            <div className="relative my-5 flex items-center justify-center"><div className="w-full border-t border-[#173f36]/12" /><span className="absolute bg-[#fbfaf6] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8883]">or use email</span></div>
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-[#e9efec] p-1">
              {(["signin", "signup"] as const).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setErrorMessage(null); }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${mode === item ? "bg-white text-[#173f36] shadow-sm" : "text-[#697872]"}`}>{item === "signin" ? "Sign in" : "Create account"}</button>)}
            </div>
            {errorMessage && <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300/60 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}</div>}
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && <label className="block text-xs font-semibold text-[#52645e]">Full name<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-[#173f36]/14 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#318a72]" autoComplete="name" /></label>}
              <label className="block text-xs font-semibold text-[#52645e]">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-[#173f36]/14 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#318a72]" autoComplete="email" /></label>
              <label className="block text-xs font-semibold text-[#52645e]">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className="mt-1.5 w-full rounded-xl border border-[#173f36]/14 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#318a72]" autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246b59] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d594b] disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mode === "signin" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4" /></>}</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

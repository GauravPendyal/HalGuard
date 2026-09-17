"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, History, ShieldCheck, ChevronDown, User } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/Button";

function Avatar({ name, picture, size = 28 }: { name: string; picture?: string; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (picture) {
    return (
      <img
        src={picture}
        alt={name || "User profile"}
        className="rounded-full object-cover border border-line"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full bg-signal/20 font-mono text-[12px] font-medium text-signal"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}

function AuthedMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1 hover:border-line-strong hover:bg-panel-raised focus-visible:outline-2 focus-visible:outline-signal"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.name || user.email} picture={user.picture} />
        <ChevronDown className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-line-strong bg-panel-raised shadow-[0_16px_48px_rgba(0,0,0,0.55)] [animation:hg-rise_0.15s_ease]"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar name={user.name || user.email} picture={user.picture} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user.name || "Signed in"}</p>
              <p className="truncate text-[12px] text-ink-muted">{user.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <Link
              href="/history"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-ink-muted hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
            >
              <History className="h-4 w-4" aria-hidden="true" />
              Verification history
            </Link>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-ink-muted hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountMenu() {
  const { enabled, status } = useAuth();

  if (!enabled) return null;

  if (status === "authenticated") return <AuthedMenu />;

  return (
    <Link href="/">
      <Button size="sm" variant="secondary">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Sign in
      </Button>
    </Link>
  );
}

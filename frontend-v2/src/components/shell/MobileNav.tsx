"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, History } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { NAV_LINKS } from "@/components/shell/TopNav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-panel-raised text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="absolute inset-0 bg-canvas-sunken/85 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(86vw,340px)] flex-col border-l border-line-strong bg-panel [animation:hg-slide-in_0.2s_var(--ease-signal)]">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <span className="hg-eyebrow">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex flex-col gap-0.5 p-3" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-3 text-[15px] text-ink-muted hover:bg-panel-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/history"
                className="flex items-center gap-2.5 rounded-md px-3 py-3 text-[15px] text-ink-muted hover:bg-panel-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
              >
                <History className="h-4 w-4" aria-hidden="true" />
                History
              </Link>
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-line p-4">
              <Link href="/app">
                <Button variant="primary" size="lg" className="w-full">
                  Verify a claim
                </Button>
              </Link>
              <div className="flex justify-center">
                <AccountMenu />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

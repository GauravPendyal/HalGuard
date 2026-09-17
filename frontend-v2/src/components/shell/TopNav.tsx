"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, History } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { MobileNav } from "@/components/shell/MobileNav";
import { cn } from "@/lib/utils/cn";

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#the-method", label: "The method" },
  { href: "/#evidence-model", label: "Evidence model" },
];

export function TopNav() {
  const pathname = usePathname();
  const onVerify = pathname === "/verify";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
          aria-label="HalluciGuard home"
        >
          <Logo />
        </Link>

        <nav
          className="ml-2 hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm px-2.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/history"
            className={cn(
              "hidden items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-signal sm:inline-flex",
              pathname === "/history" ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            <History className="h-4 w-4" aria-hidden="true" />
            History
          </Link>
          <Link href="/app" className="hidden sm:block">
            <Button
              size="sm"
              variant={onVerify ? "secondary" : "primary"}
              className={cn(onVerify && "pointer-events-none opacity-60")}
              tabIndex={onVerify ? -1 : undefined}
            >
              Verify a claim
              {!onVerify && <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </Link>
          <div className="hidden sm:block">
            <AccountMenu />
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

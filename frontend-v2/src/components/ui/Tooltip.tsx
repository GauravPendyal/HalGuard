"use client";

import * as React from "react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Tooltip — a small, keyboard-accessible explainer. Appears on hover and on
 * focus (so it is reachable without a pointer), and is wired with
 * aria-describedby. Positioned with pure CSS relative to the trigger; no
 * external positioning dependency. Intended for short strings, not rich content.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      <span
        role="tooltip"
        id={id}
        hidden={!open}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-md border border-line-strong bg-panel-raised px-2.5 py-1.5 text-[12px] leading-snug text-ink shadow-[0_8px_24px_rgba(0,0,0,0.5)]",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}

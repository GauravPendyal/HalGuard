"use client";

import * as React from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  value: string;
  label: string;
  /** Optional trailing count, rendered as a small mono figure. */
  count?: number;
  /** Optional dot color token (e.g. verified/contradicted) for filter tabs. */
  tone?: "verified" | "contradicted" | "neutral" | "signal";
}

const TONE_DOT: Record<NonNullable<TabItem["tone"]>, string> = {
  verified: "bg-verified",
  contradicted: "bg-contradicted",
  neutral: "bg-unverified",
  signal: "bg-signal",
};

/**
 * Tabs — a segmented control with full keyboard support (Left/Right/Home/End)
 * and correct ARIA. Presentation is a single inset track; the active segment is
 * a raised panel, not a colored pill, keeping with the instrument language.
 */
export function Tabs({
  items,
  value,
  onValueChange,
  ariaLabel,
  className,
}: {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    onValueChange(items[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-line bg-panel-inset p-0.5",
        className,
      )}
    >
      {items.map((item, i) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal",
              active
                ? "bg-panel-raised text-ink shadow-[0_1px_0_0_rgba(0,0,0,0.3)]"
                : "text-ink-dim hover:text-ink-muted",
            )}
          >
            {item.tone && (
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[item.tone])}
              />
            )}
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "tnum ml-0.5 rounded-[3px] px-1 font-mono text-[11px]",
                  active ? "bg-panel text-ink-muted" : "text-ink-faint",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

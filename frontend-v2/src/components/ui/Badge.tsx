import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * Compact status token. Status is conveyed by BOTH color and an optional glyph
 * / text — never color alone — so it remains legible for color-blind users and
 * in high-contrast modes.
 */
const badge = cva(
  "inline-flex items-center gap-1.5 rounded-sm border font-mono uppercase tracking-[0.06em] leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-line-strong bg-panel-inset text-ink-muted",
        signal:
          "border-[color:var(--color-signal-dim)] bg-[color:var(--color-signal-deep)] text-signal-bright",
        verified:
          "border-[color:var(--color-verified)]/35 bg-[color:var(--color-verified-deep)] text-verified",
        contradicted:
          "border-[color:var(--color-contradicted)]/35 bg-[color:var(--color-contradicted-deep)] text-contradicted",
        unverified:
          "border-[color:var(--color-unverified)]/35 bg-[color:var(--color-unverified-deep)] text-unverified",
        conflicted:
          "border-[color:var(--color-conflicted)]/35 bg-[color:var(--color-conflicted-deep)] text-conflicted",
      },
      size: {
        sm: "h-5 px-1.5 text-[10px]",
        md: "h-6 px-2 text-[11px]",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, size, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badge({ tone, size }), className)} {...props}>
      {children}
    </span>
  );
}

"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium " +
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
    "select-none disabled:pointer-events-none disabled:opacity-45 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal " +
    "active:translate-y-px",
  {
    variants: {
      variant: {
        // Primary = the calibrated signal. Reserved for the single main action.
        primary:
          "bg-signal text-canvas hover:bg-signal-bright shadow-[0_1px_0_0_rgba(0,0,0,0.4)]",
        // Neutral raised control
        secondary:
          "bg-panel-raised text-ink border border-line-strong hover:border-ink-faint hover:bg-panel",
        // Quiet control
        ghost: "text-ink-muted hover:text-ink hover:bg-panel-raised",
        // Destructive / stop
        danger:
          "bg-transparent text-contradicted border border-[color:var(--color-contradicted)]/40 hover:bg-[color:var(--color-contradicted)]/10",
        // Text-only link-like
        link: "text-signal hover:text-signal-bright underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-8 px-3 text-[13px] rounded-sm",
        md: "h-10 px-4 text-sm rounded-md",
        lg: "h-12 px-6 text-[15px] rounded-md",
        icon: "h-9 w-9 rounded-md",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(button({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

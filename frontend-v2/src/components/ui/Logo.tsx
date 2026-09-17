import { cn } from "@/lib/utils/cn";

/**
 * HalluciGuard instrument mark: a measurement reticle (crosshair + tick ring)
 * resolving to a checkmark at center — "bring a claim into focus, then confirm".
 * Monoline; the check is drawn in the calibrated signal color.
 */
export function LogoMark({
  className,
  title = "HalluciGuard",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-7 w-7", className)}
      role="img"
      aria-label={title}
      fill="none"
    >
      {/* tick ring */}
      <circle cx="16" cy="16" r="11.5" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      {/* registration ticks */}
      <g stroke="currentColor" strokeWidth="1.4" opacity="0.55" strokeLinecap="round">
        <line x1="16" y1="1.5" x2="16" y2="5" />
        <line x1="16" y1="27" x2="16" y2="30.5" />
        <line x1="1.5" y1="16" x2="5" y2="16" />
        <line x1="27" y1="16" x2="30.5" y2="16" />
      </g>
      {/* confirm mark in signal color */}
      <path
        d="M10.5 16.4l3.7 3.7 7.3-8.2"
        stroke="var(--color-signal)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[15px] font-semibold tracking-[-0.01em] text-ink",
        className,
      )}
    >
      Halluci<span className="text-ink-muted">Guard</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="text-ink" />
      <Wordmark />
    </span>
  );
}

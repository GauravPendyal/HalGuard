import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={cn("shrink-0", className)} aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="var(--accent)" />
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="url(#hg-sheen)" />
      <path d="M9.5 16.5l4 4L22.5 11" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 21.5h6" stroke="white" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="hg-sheen" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity=".28" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Wordmark({ className }) {
  return (
    <span className={cn("font-semibold tracking-[-0.02em] text-hg-text", className)}>
      Halluci<span className="text-hg-accent">Guard</span>
    </span>
  );
}

export function Orb({ className }) {
  return (
    <div className={cn("relative h-16 w-16 rounded-full hg-orb motion-safe:animate-hg-drift", className)} aria-hidden="true" />
  );
}

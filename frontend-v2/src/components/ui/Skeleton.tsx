import { cn } from "@/lib/utils/cn";

/**
 * Skeleton — a quiet placeholder for content that is genuinely loading. It uses
 * a slow sweep (disabled under prefers-reduced-motion via the global rule) and
 * never implies a specific value; it only reserves layout.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-sm bg-panel-inset",
        "after:absolute after:inset-0 after:-translate-x-full after:[animation:hg-sweep_1.6s_ease-in-out_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-line/60 after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

/** A line of skeleton text at a given width. */
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn("h-3.5 w-full", className)} />;
}

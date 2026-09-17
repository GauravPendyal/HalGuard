import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * EmptyState — a calm, specific "nothing here yet" surface. Always names what
 * will appear and how to make it appear (never a dead end). The icon is
 * decorative; the message carries the meaning.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div
          aria-hidden="true"
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-panel-inset text-ink-dim"
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-[15px] font-medium text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

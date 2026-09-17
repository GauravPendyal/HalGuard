import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

/**
 * ErrorState — an honest, specific failure surface. It states what failed in
 * plain language, optionally shows a technical detail (collapsible), and offers
 * a concrete next action. Never "Something went wrong."
 */
export function ErrorState({
  title,
  description,
  detail,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** Raw technical detail (status code, message). Shown in a mono, muted block. */
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[color:var(--color-contradicted)]/30 bg-[color:var(--color-contradicted-deep)] text-contradicted"
      >
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-[15px] font-medium text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {detail && (
        <pre className="mt-3 max-w-md overflow-x-auto rounded-md border border-line bg-panel-inset px-3 py-2 text-left font-mono text-[11px] leading-relaxed text-ink-dim">
          {detail}
        </pre>
      )}
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

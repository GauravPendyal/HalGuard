import * as React from "react";
import { ExternalLink, Globe } from "lucide-react";
import { hostOf, percent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * SourceBadge — compact provenance for a piece of evidence: where it came from,
 * a link to the original, and (when known) a credibility reading. Credibility is
 * shown as a number + label, never color alone.
 */
export function SourceBadge({
  source,
  url,
  credibility,
  className,
}: {
  source: string | null;
  url: string | null;
  credibility: number | null;
  className?: string;
}) {
  const host = url ? hostOf(url) : null;
  const label = source || host || "Unknown source";

  const content = (
    <>
      <Globe className="h-3.5 w-3.5 shrink-0 text-ink-dim" aria-hidden="true" />
      <span className="truncate">{label}</span>
      {credibility != null && (
        <span
          className="tnum ml-1 shrink-0 font-mono text-[11px] text-ink-dim"
          title="Source credibility"
        >
          cred {percent(credibility, 0)}
        </span>
      )}
      {url && <ExternalLink className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden="true" />}
    </>
  );

  const base =
    "inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-panel-inset px-2 py-1 text-[12px] text-ink-muted";

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={cn(base, "hover:border-line-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-signal", className)}
      >
        {content}
      </a>
    );
  }
  return <span className={cn(base, className)}>{content}</span>;
}

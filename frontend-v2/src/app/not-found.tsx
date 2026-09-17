import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-panel text-ink-dim"
      >
        <Compass className="h-5 w-5" />
      </span>
      <p className="mt-5 hg-eyebrow">Error 404</p>
      <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight text-ink">
        This reading isn&apos;t on the instrument.
      </h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Everything HalluciGuard can
        do starts from one of these:
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/app"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-signal px-5 py-2.5 text-[14px] font-semibold text-canvas transition-colors hover:bg-signal-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          Verify a claim
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-line-strong bg-panel px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

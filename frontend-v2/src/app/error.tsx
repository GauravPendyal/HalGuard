"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for debugging; no telemetry is sent anywhere.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-12">
      <ErrorState
        title="This page hit an unexpected error"
        description="Something in the interface failed to render. You can retry, or head back and start again."
        detail={error?.message || error?.digest}
        onRetry={reset}
        retryLabel="Try again"
      />
      <Link
        href="/"
        className="mt-1 text-[13px] text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      >
        Back to home
      </Link>
    </div>
  );
}

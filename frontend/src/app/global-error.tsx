'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 flex items-center justify-center h-screen p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">Application Error</h2>
          <p className="text-xs text-zinc-400 font-mono">{error.message || 'An unexpected system error occurred.'}</p>
          <Button onClick={() => reset()} variant="primary" className="gap-2 mx-auto">
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Application
          </Button>
        </div>
      </body>
    </html>
  );
}

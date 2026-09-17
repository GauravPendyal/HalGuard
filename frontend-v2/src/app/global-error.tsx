'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#102d27] text-white flex items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-white">Application Error</h2>
          <p className="text-xs text-[#a1b5ad] font-mono">{error.message || 'An unexpected system error occurred.'}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#246b59] px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#1d594b] transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}


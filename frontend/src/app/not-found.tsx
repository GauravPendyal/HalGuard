'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-zinc-100 p-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-blue-400 flex items-center justify-center mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-zinc-100">404 - Page Not Found</h2>
      <p className="text-xs text-zinc-400 mt-1 max-w-sm mb-6">
        The requested verification route does not exist in HalluciGuard.
      </p>
      <Link href="/">
        <Button variant="glow" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Return to Studio
        </Button>
      </Link>
    </div>
  );
}

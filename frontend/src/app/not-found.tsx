'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#102d27] text-white p-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#173f36] border border-[#246b59]/30 text-[#37977d] flex items-center justify-center mb-4 shadow-lg">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-white">404 - Page Not Found</h2>
      <p className="text-xs text-[#a1b5ad] mt-1 max-w-sm mb-6">
        The requested verification route does not exist in HalluciGuard.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-[#246b59] px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#1d594b] transition no-underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Home
      </Link>
    </div>
  );
}


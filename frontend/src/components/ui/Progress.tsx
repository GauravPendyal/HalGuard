'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps {
  value: number; // 0 - 100
  variant?: 'blue' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function Progress({
  value,
  variant = 'blue',
  size = 'md',
  showLabel = false,
  className,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const variantGradients = {
    blue: 'bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    green: 'bg-gradient-to-r from-emerald-600 to-teal-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]',
    amber: 'bg-gradient-to-r from-amber-600 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
    red: 'bg-gradient-to-r from-red-600 to-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
  };

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full overflow-hidden rounded-full bg-zinc-800/80 p-0.5', heightClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300 ease-out', variantGradients[variant])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 flex justify-between text-[10px] text-zinc-400 font-mono">
          <span>Progress</span>
          <span>{clampedValue}%</span>
        </div>
      )}
    </div>
  );
}

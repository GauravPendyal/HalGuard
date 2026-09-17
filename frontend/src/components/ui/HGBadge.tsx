'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HGBadgeProps {
  children: React.ReactNode;
  variant?: 'verified' | 'caution' | 'contradiction' | 'active' | 'system' | 'mono';
  pulse?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function HGBadge({
  children,
  variant = 'system',
  pulse = false,
  className,
  icon,
}: HGBadgeProps) {
  const variantStyles = {
    verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    caution: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    contradiction: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    active: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    system: 'bg-slate-800/80 text-slate-300 border-white/10',
    mono: 'bg-[#05080E] text-slate-400 border-white/10 font-mono-code',
  };

  const pulseColors = {
    verified: 'bg-emerald-400',
    caution: 'bg-amber-400',
    contradiction: 'bg-rose-400',
    active: 'bg-sky-400',
    system: 'bg-slate-400',
    mono: 'bg-sky-400',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border select-none',
          variantStyles[variant],
          className
        )
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', pulseColors[variant])} />
          <span className={clsx('relative inline-flex rounded-full h-2 w-2', pulseColors[variant])} />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

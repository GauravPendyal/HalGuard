'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
  {
    variants: {
      variant: {
        running: 'bg-blue-950/80 text-blue-400 border border-blue-500/40 animate-pulse',
        success: 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40',
        warning: 'bg-amber-950/80 text-amber-400 border border-amber-500/40',
        danger: 'bg-red-950/80 text-red-400 border border-red-500/40',
        neutral: 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/60',
        outline: 'bg-transparent text-zinc-400 border border-zinc-800',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  const dotColors = {
    running: 'bg-blue-400 animate-ping',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    neutral: 'bg-zinc-400',
    outline: 'bg-zinc-500',
  };

  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant || 'neutral'])} />
      )}
      {children}
    </span>
  );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  activeBorder?: 'blue' | 'green' | 'amber' | 'red' | 'default';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, activeBorder = 'default', children, ...props }, ref) => {
    const borderClasses = {
      default: 'border-zinc-800/80',
      blue: 'border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]',
      green: 'border-emerald-500/50 shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]',
      amber: 'border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]',
      red: 'border-red-500/50 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl bg-zinc-900/90 border backdrop-blur-md p-4 transition-all duration-200',
          borderClasses[activeBorder],
          interactive && 'hover:bg-zinc-800/80 hover:border-zinc-700 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function GlassPanel({ className, glow = false, children, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'glass-panel rounded-2xl p-6 shadow-2xl transition-all duration-300',
        glow && 'border-blue-500/30 shadow-[0_0_35px_-5px_rgba(59,130,246,0.25)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

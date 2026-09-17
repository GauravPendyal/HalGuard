'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionTitle({ title, subtitle, badge, action, className }: SectionTitleProps) {
  return (
    <div className={cn('flex items-start justify-between pb-3 mb-4 border-b border-zinc-800/80', className)}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-zinc-100">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

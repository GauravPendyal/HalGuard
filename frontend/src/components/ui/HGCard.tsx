'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HGCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'alpha' | 'beta' | 'gamma' | 'interactive';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function HGCard({
  children,
  variant = 'beta',
  header,
  footer,
  className,
  ...props
}: HGCardProps) {
  const variantStyles = {
    alpha: 'surface-alpha rounded-2xl p-6',
    beta: 'surface-beta rounded-2xl p-6',
    gamma: 'surface-gamma rounded-2xl p-6',
    interactive: 'surface-beta-interactive rounded-2xl p-6 cursor-pointer',
  };

  return (
    <div className={twMerge(clsx(variantStyles[variant], className))} {...props}>
      {header && <div className="mb-4 pb-3 border-b border-white/5">{header}</div>}
      <div>{children}</div>
      {footer && <div className="mt-4 pt-3 border-t border-white/5">{footer}</div>}
    </div>
  );
}

export function HGPanel({
  children,
  title,
  action,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={twMerge('surface-beta rounded-2xl flex flex-col overflow-hidden', className)}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-[#090E17]/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono-code">
            {title}
          </span>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

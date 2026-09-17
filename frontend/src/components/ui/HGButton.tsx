'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface HGButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'verified' | 'terminal';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export function HGButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className,
  disabled,
  ...props
}: HGButtonProps) {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#020408] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] select-none';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-4 text-sm rounded-xl gap-2',
    lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-sky-500/20 border border-sky-400/30 focus:ring-sky-400',
    secondary: 'surface-beta hover:bg-slate-800/80 text-slate-200 border border-white/10 hover:border-sky-500/40 focus:ring-slate-400',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white border border-transparent focus:ring-slate-500',
    danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 focus:ring-rose-500',
    verified: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 focus:ring-emerald-500',
    terminal: 'surface-alpha font-mono-code text-xs text-sky-400 border border-sky-500/30 hover:border-sky-400 hover:bg-sky-950/30 focus:ring-sky-500',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon && <span className="flex items-center shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
}

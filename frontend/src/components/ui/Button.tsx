'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-950/40 border border-blue-400/20',
        glow: 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_-3px_rgba(59,130,246,0.5)] border border-blue-400/30',
        secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700/60',
        outline: 'border border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700',
        ghost: 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
        danger: 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base rounded-xl',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

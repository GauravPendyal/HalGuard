'use client';

import * as React from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  shortcut?: string;
  onEnter?: () => void;
}

export const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, shortcut = '⌘K', onEnter, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl bg-zinc-900/90 border border-zinc-800 py-2 pl-9 pr-12 text-sm text-zinc-100 placeholder-zinc-500 backdrop-blur-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
            className
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) {
              onEnter();
            }
          }}
          {...props}
        />
        <div className="absolute right-3 flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50">
          <span>{shortcut}</span>
          <CornerDownLeft className="w-2.5 h-2.5" />
        </div>
      </div>
    );
  }
);
CommandInput.displayName = 'CommandInput';

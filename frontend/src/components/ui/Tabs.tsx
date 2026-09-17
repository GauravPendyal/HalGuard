'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  variant?: 'pills' | 'underline';
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
  variant = 'underline',
}: TabsProps<T>) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-zinc-800/80 px-2',
        variant === 'pills' && 'border-b-0 p-1 bg-zinc-900/80 rounded-lg',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-medium transition-all relative whitespace-nowrap',
              variant === 'underline' && [
                'text-zinc-400 hover:text-zinc-200',
                isActive && 'text-blue-400 font-semibold',
              ],
              variant === 'pills' && [
                'rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
                isActive && 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30',
              ]
            )}
          >
            {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
                {tab.badge}
              </span>
            )}
            {variant === 'underline' && isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

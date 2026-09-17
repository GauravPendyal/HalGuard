'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Plus,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Sparkles,
  Search,
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { sidebarCollapse } from '@/lib/animations';

export function Sidebar() {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    setAnalyticsOpen,
    setSettingsOpen,
    createNewSession,
  } = useChatStore();

  const navItems = [
    {
      id: 'studio',
      label: 'Verification Studio',
      icon: <Sparkles className="w-4 h-4 text-blue-400" />,
      active: true,
    },
    {
      id: 'history',
      label: 'History',
      icon: <Clock className="w-4 h-4 text-zinc-400" />,
      active: false,
    },
    {
      id: 'center',
      label: 'Verification Center',
      icon: <BarChart3 className="w-4 h-4 text-emerald-400" />,
      active: false,
      onClick: () => setAnalyticsOpen(true),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4 text-zinc-400" />,
      active: false,
      onClick: () => setSettingsOpen(true),
    },
  ];

  return (
    <motion.aside
      variants={sidebarCollapse}
      initial={isSidebarCollapsed ? 'collapsed' : 'expanded'}
      animate={isSidebarCollapsed ? 'collapsed' : 'expanded'}
      className="relative flex flex-col h-screen bg-zinc-950/95 border-r border-zinc-800/80 backdrop-blur-xl z-30 select-none"
    >
      {/* Header & Logo */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-950/60 border border-blue-400/30 shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
            <span className="absolute inset-0 rounded-xl bg-blue-500/20 animate-pulse-glow" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                HalluciGuard
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-blue-950 text-blue-400 border border-blue-800/50">
                  v2.0
                </span>
              </span>
              <span className="text-[10px] text-zinc-400">AI Verification OS</span>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
          aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* New Verification Action */}
      <div className="p-3">
        <Button
          onClick={createNewSession}
          variant="glow"
          className={cn('w-full justify-start gap-2 shadow-lg', isSidebarCollapsed && 'px-0 justify-center')}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isSidebarCollapsed && <span>New Verification</span>}
        </Button>
      </div>

      {/* Search Bar Placeholder */}
      {!isSidebarCollapsed && (
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search history..."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
              item.active
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}

        {/* History Group Placeholder */}
        {!isSidebarCollapsed && (
          <div className="pt-4 px-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              Recent Audits
            </span>
            <div className="mt-2 space-y-1">
              {['Medical Trial Data Check', 'Financial Quarterly Report', 'Quantum Computing Claims'].map(
                (historyTitle, idx) => (
                  <div
                    key={idx}
                    className="truncate text-xs text-zinc-400 hover:text-zinc-200 py-1.5 px-2 rounded-lg hover:bg-zinc-900/60 cursor-pointer transition-colors"
                  >
                    {historyTitle}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Profile */}
      <div className="p-3 border-t border-zinc-800/60">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/40',
            isSidebarCollapsed && 'justify-center p-1'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            HG
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-medium text-zinc-200 truncate">Enterprise User</span>
              <span className="text-[10px] text-zinc-500 truncate">Verified Tier</span>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

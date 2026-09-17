'use client';

import * as React from 'react';
import { useChatStore } from '@/store/chatStore';
import { Copy, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function AppStateInspector() {
  const storeState = useChatStore();
  const [copied, setCopied] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSlice, setSelectedSlice] = React.useState<string>('ALL');

  const formattedJson = React.useMemo(() => {
    // Filter out functions from Zustand store
    const stateOnly = Object.fromEntries(
      Object.entries(storeState).filter(([, v]) => typeof v !== 'function')
    );
    return JSON.stringify(stateOnly, null, 2);
  }, [storeState]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full space-y-3 font-mono text-xs select-none">
      <div className="flex items-center justify-between p-2 bg-zinc-950 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2">
          <select
            value={selectedSlice}
            onChange={(e) => setSelectedSlice(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 outline-none"
          >
            <option value="ALL">All Store Slices</option>
            <option value="conversation">Conversation Slice</option>
            <option value="workflow">Workflow Slice</option>
            <option value="verification">Verification Slice</option>
            <option value="settings">Settings Slice</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search state keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 outline-none w-48 focus:border-blue-500"
            />
          </div>

          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 overflow-y-auto p-3">
        <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
          {formattedJson}
        </pre>
      </div>
    </div>
  );
}

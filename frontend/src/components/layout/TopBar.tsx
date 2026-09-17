'use client';

import * as React from 'react';
import { ShieldCheck, Download, ChevronDown, Sliders, Cpu, Activity, Zap, Terminal } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VerificationMode, ModelOption } from '@/types';

export function TopBar() {
  const {
    verificationMode,
    setVerificationMode,
    selectedModel,
    setSelectedModel,
    setReportOpen,
    toggleDeveloperMode,
  } = useChatStore();

  const [isModeOpen, setIsModeOpen] = React.useState(false);
  const [isModelOpen, setIsModelOpen] = React.useState(false);

  const modes: { id: VerificationMode; label: string; desc: string; color: string }[] = [
    { id: 'strict', label: 'Strict Verification', desc: '100% consensus, 30+ web API sources', color: 'text-emerald-400' },
    { id: 'standard', label: 'Standard Guard', desc: 'Balanced accuracy & sub-second latency', color: 'text-blue-400' },
    { id: 'fast', label: 'Fast Pass', desc: 'Heuristic & vector memory verification', color: 'text-amber-400' },
  ];

  const models: ModelOption[] = [
    'HalluciGuard-v2-Deep',
    'GPT-4o-Guard',
    'Claude-3.5-Verify',
  ];

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-zinc-950/80 border-b border-zinc-800/80 backdrop-blur-xl z-20 select-none">
      {/* Product Identity Title & Live Telemetry */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">
            AI Verification Workspace
          </h1>
        </div>
        <div className="h-4 w-px bg-zinc-800" />
        <div className="flex items-center gap-2">
          <Badge variant="running" dot>
            Engine Ready
          </Badge>
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>340ms</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
            <Activity className="w-3 h-3 text-purple-400" />
            <span>Mock Mode</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Mode & Model Selector */}
      <div className="flex items-center gap-3">
        {/* Dev Mode Button */}
        <button
          onClick={toggleDeveloperMode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-all"
          title="Developer & Diagnostics Center (⌘⇧D)"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Dev Mode</span>
          <kbd className="px-1 py-0.2 rounded bg-zinc-950 text-[10px] text-zinc-500 border border-zinc-800">
            ⌘⇧D
          </kbd>
        </button>

        {/* Verification Mode Selector */}
        <div className="relative">
          <button
            onClick={() => setIsModeOpen(!isModeOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-200 transition-all"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>{modes.find((m) => m.id === verificationMode)?.label}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isModeOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-zinc-900 border border-zinc-800 p-2 shadow-2xl z-50">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setVerificationMode(mode.id);
                    setIsModeOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs hover:bg-zinc-800/80 transition-colors ${
                    verificationMode === mode.id ? 'bg-zinc-800/60 font-semibold' : ''
                  }`}
                >
                  <div className={`font-medium ${mode.color}`}>{mode.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{mode.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model Selector */}
        <div className="relative">
          <button
            onClick={() => setIsModelOpen(!isModelOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 transition-all"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>{selectedModel}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isModelOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-zinc-900 border border-zinc-800 p-2 shadow-2xl z-50">
              {models.map((model) => (
                <button
                  key={model}
                  onClick={() => {
                    setSelectedModel(model);
                    setIsModelOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 transition-colors ${
                    selectedModel === model ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-300'
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export Audit Report Button */}
        <Button
          onClick={() => setReportOpen(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="w-3.5 h-3.5 text-zinc-400" />
          <span>Export Report</span>
        </Button>
      </div>
    </header>
  );
}

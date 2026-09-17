'use client';

import * as React from 'react';
import {
  Send,
  Paperclip,
  Mic,
  FileText,
  Stethoscope,
  TrendingUp,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { verificationService } from '@/services/verification';
import { VerificationMode } from '@/types';

export function ChatConsole() {
  const [prompt, setPrompt] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { verificationMode, setVerificationMode, selectedModel } = useChatStore();

  const promptChips = [
    { label: 'Research', icon: <FileText className="w-3 h-3 text-blue-400" />, text: 'Verify recent cancer research trial results in PubMed.' },
    { label: 'Medical', icon: <Stethoscope className="w-3 h-3 text-emerald-400" />, text: 'Check clinical dosage protocols for mRNA vaccines.' },
    { label: 'Finance', icon: <TrendingUp className="w-3 h-3 text-amber-400" />, text: 'Audit quarterly revenue metrics in SEC 10-K filing.' },
    { label: 'Legal', icon: <Scale className="w-3 h-3 text-purple-400" />, text: 'Scan Supreme Court precedent holdings on IP law.' },
    { label: 'Code', icon: <ShieldCheck className="w-3 h-3 text-cyan-400" />, text: 'Review Python memory safety in async event loops.' },
  ];

  const handleSend = () => {
    if (!prompt.trim()) return;
    verificationService.verifyPrompt(prompt.trim(), verificationMode, selectedModel);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 select-none">
      {/* Category Prompt Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 mb-2">
        {promptChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(chip.text);
              if (textareaRef.current) textareaRef.current.focus();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white transition-all shrink-0 backdrop-blur-md"
          >
            {chip.icon}
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Glassmorphic Command Input Console */}
      <div className="relative rounded-2xl bg-zinc-900/90 border border-zinc-800/90 p-3 shadow-2xl backdrop-blur-xl focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/60 transition-all">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask anything. HalluciGuard verifies before answering..."
          className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none pr-20 max-h-40 scrollbar-thin"
        />

        {/* Bottom Toolbar & Action Triggers */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-2">
          <div className="flex items-center gap-2">
            {/* Mode Toggle Selector */}
            <select
              value={verificationMode}
              onChange={(e) => setVerificationMode(e.target.value as VerificationMode)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 outline-none cursor-pointer hover:border-zinc-700"
            >
              <option value="strict">Strict Verification Mode</option>
              <option value="standard">Standard Guard Mode</option>
              <option value="fast">Fast Pass Mode</option>
            </select>

            <button
              type="button"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Attach Document"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Voice Verification"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline-block">
              Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Enter ↵</kbd>
            </span>
            <button
              onClick={handleSend}
              disabled={!prompt.trim()}
              className="flex items-center justify-center p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-950/50 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Shield, Zap, Sparkles, BookOpen, Stethoscope, Landmark, Scale, Code2, Paperclip } from 'lucide-react';
import { VerificationMode } from '@/types';
import { HGButton } from './HGButton';

interface HGPromptInputProps {
  onSubmit: (prompt: string, mode: VerificationMode, domain: string) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function HGPromptInput({
  onSubmit,
  loading = false,
  disabled = false,
  className,
}: HGPromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<VerificationMode>('strict');
  const [domain, setDomain] = useState<string>('general');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const domains = [
    { id: 'general', label: 'General / Research', icon: <BookOpen className="w-3 h-3" /> },
    { id: 'medical', label: 'Medical / Clinical', icon: <Stethoscope className="w-3 h-3" /> },
    { id: 'finance', label: 'Finance / SEC', icon: <Landmark className="w-3 h-3" /> },
    { id: 'legal', label: 'Legal / Statutory', icon: <Scale className="w-3 h-3" /> },
    { id: 'code', label: 'Technical / Code', icon: <Code2 className="w-3 h-3" /> },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !loading && !disabled) {
        onSubmit(prompt.trim(), mode, domain);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !loading && !disabled) {
      onSubmit(prompt.trim(), mode, domain);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className={`flex flex-col gap-3 ${className || ''}`}>
      {/* Domain Preset Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {domains.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setDomain(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 shrink-0 select-none ${
              domain === item.id
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 shadow-sm'
                : 'bg-[#05080E] text-slate-400 border-white/5 hover:border-white/15 hover:text-slate-200'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Input Box Shell */}
      <div className="surface-beta rounded-2xl p-3.5 border border-white/10 hover:border-sky-500/30 focus-within:border-sky-400/50 focus-within:shadow-xl focus-within:shadow-sky-500/10 transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter an AI query or statement to inspect, cross-verify and ground against evidence..."
          rows={2}
          disabled={disabled || loading}
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 resize-none focus:outline-none leading-relaxed font-sans"
        />

        {/* Action Controls Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 mt-2 border-t border-white/5">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode(mode === 'strict' ? 'fast' : 'strict')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono-code font-medium border transition-colors ${
                mode === 'strict'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-sky-500/15 text-sky-300 border-sky-500/40'
              }`}
            >
              {mode === 'strict' ? <Shield className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span>{mode === 'strict' ? 'Strict Multi-Agent' : 'Fast-Path Detector'}</span>
            </button>
            <span className="text-[11px] font-mono-code text-slate-500 hidden sm:inline">
              [Shift+Enter for newline]
            </span>
          </div>

          {/* Submit Trigger */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <HGButton
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
              disabled={!prompt.trim() || disabled}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              {loading ? 'Verifying...' : 'Verify Answer'}
            </HGButton>
          </div>
        </div>
      </div>
    </form>
  );
}

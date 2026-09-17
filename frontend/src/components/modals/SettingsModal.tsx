'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useChatStore } from '@/store/chatStore';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, settings, updateSettings } = useChatStore();

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Platform Settings"
      description="Configure multi-agent verification parameters and security controls."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Strictness Slider */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
          <div className="flex justify-between items-center text-zinc-300">
            <span className="font-medium flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Strictness Consensus Threshold
            </span>
            <span className="font-mono text-blue-400 font-bold">{settings.strictnessThreshold}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="99"
            value={settings.strictnessThreshold}
            onChange={(e) => updateSettings({ strictnessThreshold: Number(e.target.value) })}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>

        {/* Switches */}
        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
            <span className="text-zinc-300 font-medium">Automatic Hallucination Diff Patching</span>
            <input
              type="checkbox"
              checked={settings.enableAutoCorrect}
              onChange={(e) => updateSettings({ enableAutoCorrect: e.target.checked })}
              className="accent-blue-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
            <span className="text-zinc-300 font-medium">Persistent Vector Memory Caching</span>
            <input
              type="checkbox"
              checked={settings.enableMemoryCache}
              onChange={(e) => updateSettings({ enableMemoryCache: e.target.checked })}
              className="accent-blue-500 rounded"
            />
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => setSettingsOpen(false)} variant="primary" size="sm">
            Save Configuration
          </Button>
        </div>
      </div>
    </Modal>
  );
}

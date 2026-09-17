'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useChatStore } from '@/store/chatStore';
import { ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function AnalyticsModal() {
  const { isAnalyticsOpen, setAnalyticsOpen } = useChatStore();

  return (
    <Modal
      isOpen={isAnalyticsOpen}
      onClose={() => setAnalyticsOpen(false)}
      title="Verification System Analytics"
      description="Real-time multi-agent performance metrics and consensus statistics."
      maxWidth="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-zinc-950 border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Prevention Rate</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">99.4%</div>
          </Card>
          <Card className="p-3 bg-zinc-950 border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>Avg Latency</span>
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1">340ms</div>
          </Card>
          <Card className="p-3 bg-zinc-950 border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Claims Audited</span>
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">12,840</div>
          </Card>
        </div>
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center text-xs text-zinc-500">
          Analytics dashboard visualizations will be fully populated in Sprint 4.
        </div>
      </div>
    </Modal>
  );
}

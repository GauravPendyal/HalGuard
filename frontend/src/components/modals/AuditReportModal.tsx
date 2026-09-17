'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useChatStore } from '@/store/chatStore';
import { Download, FileJson, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function AuditReportModal() {
  const { isReportOpen, setReportOpen } = useChatStore();

  return (
    <Modal
      isOpen={isReportOpen}
      onClose={() => setReportOpen(false)}
      title="Verification Audit Report"
      description="Download authoritative cryptographic proof and evidence trails."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Overall Trust Score</span>
            <span className="text-emerald-400 font-bold font-mono text-sm flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> 98.4% Verified
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Audited Claims</span>
            <span className="text-zinc-200 font-mono">8 Total (7 Verified, 1 Corrected)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Primary Ground Truth</span>
            <span className="text-blue-400 font-mono">CrossRef, PubMed, Wikipedia</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="gap-2 w-full justify-center">
            <FileJson className="w-4 h-4 text-amber-400" />
            Download JSON
          </Button>
          <Button variant="primary" className="gap-2 w-full justify-center">
            <Download className="w-4 h-4" />
            Export PDF Report
          </Button>
        </div>
      </div>
    </Modal>
  );
}

'use client';

import * as React from 'react';
import { eventBus } from '@/engine';
import { ClaimChip } from './ClaimChip';
import { EvidenceCard, EvidenceItem } from './EvidenceCard';
import { ConsensusMeter } from './ConsensusMeter';
import { DiffViewer, DiffChunk } from './DiffViewer';
import { VerificationCertificate, CertificateData } from './VerificationCertificate';
import { VerificationClaim } from '@/types';
import { ShieldCheck, Cpu, Search, FileCheck } from 'lucide-react';

export function VerificationCard() {
  const [promptText, setPromptText] = React.useState<string | null>(null);
  const [draftText, setDraftText] = React.useState<string>('');
  const [isDrafting, setIsDrafting] = React.useState<boolean>(false);
  const [claims, setClaims] = React.useState<VerificationClaim[]>([]);
  const [evidenceList, setEvidenceList] = React.useState<EvidenceItem[]>([]);
  const [confidence, setConfidence] = React.useState<number>(0);
  const [diffs, setDiffs] = React.useState<DiffChunk[] | null>(null);
  const [finalResponse, setFinalResponse] = React.useState<string | null>(null);
  const [certificate, setCertificate] = React.useState<CertificateData | null>(null);

  React.useEffect(() => {
    const unsub1 = eventBus.on('PROMPT_SUBMITTED', (p) => {
      setPromptText(p.prompt);
      setDraftText('');
      setIsDrafting(true);
      setClaims([]);
      setEvidenceList([]);
      setConfidence(0);
      setDiffs(null);
      setFinalResponse(null);
      setCertificate(null);
    });

    const unsub2 = eventBus.on('LLM_DRAFT_STREAM', (p) => {
      setDraftText(p.accumulatedText);
    });

    const unsub3 = eventBus.on('LLM_DRAFT_COMPLETED', () => {
      setIsDrafting(false);
    });

    const unsub4 = eventBus.on('CLAIMS_EXTRACTED', (p) => {
      setClaims(p.claims);
    });

    const unsub5 = eventBus.on('EVIDENCE_DISCOVERED', (p) => {
      setEvidenceList(p.evidence);
    });

    const unsub6 = eventBus.on('CONSENSUS_UPDATED', (p) => {
      setConfidence(p.confidence);
    });

    const unsub7 = eventBus.on('CORRECTION_COMPLETED', (p) => {
      setDiffs(p.diffs);
    });

    const unsub8 = eventBus.on('VERIFICATION_COMPLETED', (p) => {
      setFinalResponse(p.finalResponse);
      setCertificate({
        certificateId: p.certificateId,
        overallConfidence: p.overallConfidence,
        claimsCount: 3,
        sourcesCount: 3,
        totalExecutionTimeMs: p.totalExecutionTimeMs,
      });
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
    };
  }, []);

  if (!promptText) return null;

  return (
    <div className="w-full max-w-4xl mx-auto my-6 space-y-4 select-none">
      {/* User Prompt Card */}
      <div className="flex justify-end">
        <div className="max-w-xl rounded-2xl bg-blue-600/20 border border-blue-500/40 p-4 text-xs text-blue-100 backdrop-blur-md shadow-lg">
          <span className="text-[10px] font-mono text-blue-400 font-semibold block mb-1 uppercase tracking-wider">
            User Query
          </span>
          {promptText}
        </div>
      </div>

      {/* Verification Master Card */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 backdrop-blur-xl shadow-2xl space-y-5">
        {/* Section 1: Candidate Draft Streaming */}
        {draftText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
              <Cpu className="w-4 h-4" />
              <span>1. Reasoner Candidate Draft</span>
              {isDrafting && <span className="text-[10px] text-zinc-500 animate-pulse">(Streaming...)</span>}
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-mono">
              {draftText}
            </div>
          </div>
        )}

        {/* Section 2: Claim Extraction */}
        {claims.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Search className="w-4 h-4" />
              <span>2. Investigator Claim Extraction ({claims.length} Claims)</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {claims.map((claim) => (
                <ClaimChip key={claim.id} claim={claim} />
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Evidence Discovery */}
        {evidenceList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <FileCheck className="w-4 h-4" />
              <span>3. Archivist Ground Truth Evidence</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {evidenceList.map((item, idx) => (
                <EvidenceCard key={idx} item={item} index={idx} />
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Arbiter Consensus Score */}
        {confidence > 0 && <ConsensusMeter confidence={confidence} />}

        {/* Section 5: Refiner Diff Correction */}
        {diffs && <DiffViewer diffs={diffs} />}

        {/* Section 6: Final Verified Response */}
        {finalResponse && (
          <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/40 space-y-2 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Answer</span>
            </div>
            <p className="text-xs text-zinc-100 leading-relaxed font-sans">{finalResponse}</p>
          </div>
        )}

        {/* Section 7: Verification Certificate */}
        {certificate && <VerificationCertificate data={certificate} />}
      </div>
    </div>
  );
}

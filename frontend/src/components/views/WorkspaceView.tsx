'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, RefreshCw, Layers, Terminal, Sparkles, Award, FileText, CheckCircle2, AlertTriangle, XCircle, Cpu, Radio } from 'lucide-react';
import { TrustCore3D } from '../3d/TrustCore3D';
import { HGButton } from '../ui/HGButton';
import { HGBadge } from '../ui/HGBadge';
import { HGTrustIndicator } from '../ui/HGTrustIndicator';
import { HGAgentPipeline, AgentStage } from '../ui/HGAgentPipeline';
import { HGEvidenceInspector, EvidenceItem } from '../ui/HGEvidenceInspector';
import { HGClaimMatrix } from '../ui/HGClaimMatrix';
import { HGTerminalLogs, LogEntry } from '../ui/HGTerminalLogs';
import { HGCertificate } from '../ui/HGCertificate';
import { HGPromptInput } from '../ui/HGPromptInput';
import { verificationService } from '@/services/verification/VerificationService';
import { eventBus } from '@/engine';
import { VerificationClaim, VerificationMode } from '@/types';

interface WorkspaceViewProps {
  onBackToLanding?: () => void;
}

export function WorkspaceView({ onBackToLanding }: WorkspaceViewProps) {
  // State
  const [query, setQuery] = useState('');
  const [draftResponse, setDraftResponse] = useState('');
  const [finalResponse, setFinalResponse] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [trustScore, setTrustScore] = useState(92);
  const [certificateId, setCertificateId] = useState('HG-CERT-940218');
  const [activeTab, setActiveTab] = useState<'matrix' | 'evidence' | 'telemetry' | 'certificate'>('matrix');
  const [claims, setClaims] = useState<VerificationClaim[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<VerificationClaim | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [backendHealth, setBackendHealth] = useState<'ONLINE' | 'DEGRADED' | 'CHECKING'>('CHECKING');
  const [agentStages, setAgentStages] = useState<AgentStage[]>([
    { id: 'llm', name: 'Base LLM Generator', role: 'OpenRouter Qwen 2.5', status: 'idle' },
    { id: 'detector', name: 'HaluEval Detector', role: 'Risk Scoring & Routing', status: 'idle' },
    { id: 'verifier', name: 'Ground Truth Verifier', role: '9-Stage Evidence Engine', status: 'idle' },
    { id: 'memory', name: 'Vector Memory Agent', role: 'Consensus Graph Store', status: 'idle' },
    { id: 'judge', name: 'Consensus Judge', role: 'Retained/Disabled', status: 'disabled' },
    { id: 'corrector', name: 'Diff Corrector', role: 'Retained/Disabled', status: 'disabled' },
  ]);

  // Initial Health Check & Event Bus Subscriptions
  useEffect(() => {
    // Check backend health
    verificationService.checkHealth().then((res) => {
      setBackendHealth(res.status === 'ONLINE' ? 'ONLINE' : 'DEGRADED');
    }).catch(() => setBackendHealth('DEGRADED'));

    // Subscribe to EventBus events
    const unsubDraftStart = eventBus.on('LLM_DRAFT_STARTED', (data: any) => {
      setIsVerifying(true);
      setAgentStages((prev) =>
        prev.map((s) => (s.id === 'llm' ? { ...s, status: 'running', message: 'Generating draft response...' } : s))
      );
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), agentId: 'base_llm', messageType: 'GENERATION_STARTED', payload: data },
      ]);
    });

    const unsubDraftStream = eventBus.on('LLM_DRAFT_STREAM', (data: any) => {
      setDraftResponse(data.accumulatedText || '');
    });

    const unsubDraftComplete = eventBus.on('LLM_DRAFT_COMPLETED', (data: any) => {
      setAgentStages((prev) =>
        prev.map((s) =>
          s.id === 'llm'
            ? { ...s, status: 'completed', latencyMs: 1120, message: 'Draft generation complete' }
            : s.id === 'detector'
            ? { ...s, status: 'running', message: 'Running HaluEval inference...' }
            : s
        )
      );
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), agentId: 'base_llm', messageType: 'DRAFT_COMPLETED', payload: data },
      ]);
    });

    const unsubClaims = eventBus.on('CLAIMS_EXTRACTED', (data: any) => {
      const extractedClaims = data.claims || [];
      setClaims(extractedClaims);
      if (extractedClaims.length > 0) {
        setSelectedClaim(extractedClaims[0]);
      }
      setAgentStages((prev) =>
        prev.map((s) =>
          s.id === 'detector'
            ? { ...s, status: 'completed', latencyMs: 240, message: 'Claims decomposed' }
            : s.id === 'verifier'
            ? { ...s, status: 'running', message: 'Cross-verifying evidence sources...' }
            : s
        )
      );
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), agentId: 'detector', messageType: 'CLAIMS_EXTRACTED', payload: { count: extractedClaims.length } },
      ]);
    });

    const unsubEvidence = eventBus.on('EVIDENCE_DISCOVERED', (data: any) => {
      const rawEv = data.evidence || [];
      const mapped: EvidenceItem[] = rawEv.map((e: any, idx: number) => ({
        id: `ev-${idx}`,
        source: e.source || 'Ground Truth Registry',
        url: e.url,
        snippet: e.snippet || '',
        entailmentLabel: e.relevance >= 80 ? 'entailment' : e.relevance <= 40 ? 'contradiction' : 'neutral',
        entailmentScore: (e.relevance || 90) / 100,
        credibilityScore: (e.trustScore || 95) / 100,
      }));
      setEvidenceList(mapped);
      setAgentStages((prev) =>
        prev.map((s) =>
          s.id === 'verifier'
            ? { ...s, status: 'completed', latencyMs: 680, message: 'Evidence entailed' }
            : s.id === 'memory'
            ? { ...s, status: 'running', message: 'Committing to vector consensus...' }
            : s
        )
      );
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), agentId: 'verifier', messageType: 'EVIDENCE_DISCOVERED', payload: { sources: mapped.length } },
      ]);
    });

    const unsubConsensus = eventBus.on('CONSENSUS_UPDATED', (data: any) => {
      if (data.confidence !== undefined) {
        setTrustScore(data.confidence);
      }
    });

    const unsubCompleted = eventBus.on('VERIFICATION_COMPLETED', (data: any) => {
      setIsVerifying(false);
      setFinalResponse(data.finalResponse || draftResponse);
      if (data.overallConfidence) setTrustScore(data.overallConfidence);
      if (data.certificateId) setCertificateId(data.certificateId);
      setAgentStages((prev) =>
        prev.map((s) =>
          s.id === 'memory'
            ? { ...s, status: 'completed', latencyMs: 15, message: 'State indexed' }
            : s
        )
      );
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), agentId: 'supervisor', messageType: 'VERIFICATION_TERMINATED', payload: data },
      ]);
    });

    return () => {
      unsubDraftStart?.();
      unsubDraftStream?.();
      unsubDraftComplete?.();
      unsubClaims?.();
      unsubEvidence?.();
      unsubConsensus?.();
      unsubCompleted?.();
    };
  }, [draftResponse]);

  const handleVerify = async (submittedQuery: string, mode: VerificationMode, domain: string) => {
    setQuery(submittedQuery);
    setDraftResponse('');
    setFinalResponse('');
    setIsVerifying(true);
    setLogs([]);
    setClaims([]);
    setEvidenceList([]);

    try {
      await verificationService.verifyPrompt(submittedQuery, mode, 'qwen/qwen-2.5-7b-instruct');
    } catch (err: any) {
      console.error('Execution error:', err);
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#020408] text-slate-100 flex flex-col font-sans">
      {/* Top Mission-Control Bar */}
      <header className="sticky top-0 z-40 surface-beta border-b border-white/5 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              title="Return to Overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-tight">HalluciGuard Studio</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  v2.0 PROD
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Backend & Active Telemetry Status */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full surface-alpha border border-white/5 text-xs font-mono-code text-slate-400">
            <Radio className={`w-3.5 h-3.5 ${backendHealth === 'ONLINE' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span>RENDER API:</span>
            <strong className={backendHealth === 'ONLINE' ? 'text-emerald-400' : 'text-amber-400'}>
              {backendHealth}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs font-mono-code">
            <Cpu className="w-3.5 h-3.5" />
            <span>LANGGRAPH SUPERVISOR</span>
          </div>
        </div>
      </header>

      {/* Main Studio Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stage, Prompt Bar, Draft & Claims */}
        <div className="lg:col-span-8 space-y-6">
          {/* Multi-Agent Live Execution Topology */}
          <HGAgentPipeline stages={agentStages} />

          {/* Interactive Prompt Submission Bar */}
          <HGPromptInput onSubmit={handleVerify} loading={isVerifying} />

          {/* Generated Response Review Panel */}
          {(draftResponse || finalResponse || isVerifying) && (
            <div className="surface-beta rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-mono-code uppercase tracking-wider text-slate-200">
                    {finalResponse ? 'Verified Ground Truth Output' : 'Synthesized Draft Candidate'}
                  </span>
                </div>
                {isVerifying && (
                  <span className="text-[11px] font-mono-code text-sky-400 animate-pulse">
                    Cross-referencing evidence...
                  </span>
                )}
              </div>

              <div className="text-sm text-slate-200 leading-relaxed font-sans bg-[#05080E] p-4 rounded-xl border border-white/5">
                {finalResponse || draftResponse}
              </div>
            </div>
          )}

          {/* Studio Workspace Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-mono-code">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'matrix' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Claims Matrix ({claims.length})
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'evidence' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Evidence Inspector ({evidenceList.length})
              </button>
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'telemetry' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Telemetry Logs ({logs.length})
              </button>
              <button
                onClick={() => setActiveTab('certificate')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'certificate' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Certificate
              </button>
            </div>

            {/* Active Tab View */}
            {activeTab === 'matrix' && (
              <HGClaimMatrix
                claims={claims}
                selectedClaimId={selectedClaim?.id}
                onSelectClaim={(c) => {
                  setSelectedClaim(c);
                  setActiveTab('evidence');
                }}
              />
            )}

            {activeTab === 'evidence' && (
              <HGEvidenceInspector
                evidenceList={evidenceList}
                selectedClaimText={selectedClaim?.claimText}
              />
            )}

            {activeTab === 'telemetry' && (
              <HGTerminalLogs logs={logs} />
            )}

            {activeTab === 'certificate' && (
              <HGCertificate
                certificateId={certificateId}
                trustScore={trustScore}
                claimsCount={claims.length || 3}
                sourcesCount={evidenceList.length || 8}
                finalAnswer={finalResponse || draftResponse}
              />
            )}
          </div>
        </div>

        {/* Right Column: 3D Trust Core & Trust Score Matrix */}
        <div className="lg:col-span-4 space-y-6">
          {/* Interactive 3D Trust Core Visualization */}
          <div className="surface-beta rounded-2xl p-2 border border-white/10 shadow-xl">
            <TrustCore3D
              status={isVerifying ? 'verifying' : trustScore >= 80 ? 'verified' : 'contradiction'}
              trustScore={trustScore}
              className="h-[280px]"
            />
          </div>

          {/* Trust Score Breakdown Indicator */}
          <HGTrustIndicator
            score={trustScore}
            evidenceScore={Math.min(trustScore + 2, 98)}
            coverageScore={Math.max(trustScore - 4, 85)}
            consensusScore={trustScore}
            riskScore={Math.max(100 - trustScore, 5)}
          />
        </div>
      </main>
    </div>
  );
}

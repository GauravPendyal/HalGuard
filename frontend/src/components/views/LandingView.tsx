'use client';

import React from 'react';
import { ShieldCheck, ArrowRight, Activity, Database, Sparkles, Scale, BookOpen, Stethoscope, Landmark, Layers, Lock, Cpu, Globe, CheckCircle2 } from 'lucide-react';
import { TrustCore3D } from '../3d/TrustCore3D';
import { EvidenceGraph3D } from '../3d/EvidenceGraph3D';
import { HGButton } from '../ui/HGButton';
import { HGBadge } from '../ui/HGBadge';
import { HGTrustIndicator } from '../ui/HGTrustIndicator';
import { HGAgentPipeline } from '../ui/HGAgentPipeline';

interface LandingViewProps {
  onEnterStudio: () => void;
}

export function LandingView({ onEnterStudio }: LandingViewProps) {
  return (
    <div className="w-full min-h-screen bg-[#020408] text-slate-100 selection:bg-sky-500/30 selection:text-white relative overflow-hidden font-sans">
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-sky-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Global Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#020408]/80 border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-400/40 text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">HalluciGuard</span>
              <span className="ml-2 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                AI VERIFICATION OS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono-code text-slate-400">
            <a href="#pipeline" className="hover:text-sky-400 transition-colors">PIPELINE</a>
            <a href="#agents" className="hover:text-sky-400 transition-colors">AGENTS</a>
            <a href="#evidence" className="hover:text-sky-400 transition-colors">EVIDENCE</a>
            <a href="#benchmarks" className="hover:text-sky-400 transition-colors">BENCHMARKS</a>
          </nav>

          <div className="flex items-center gap-3">
            <HGButton variant="primary" size="sm" onClick={onEnterStudio} icon={<ArrowRight className="w-4 h-4" />}>
              Open Studio
            </HGButton>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Narrative Copy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full surface-beta text-xs font-mono-code text-sky-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ZERO-TRUST AI VERIFICATION STANDARD</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08]">
              AI can speak. <br />
              <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                Evidence decides.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl font-normal">
              HalluciGuard is the mission-control verification operating system that sits between AI generation and production consumption—decomposing atomic claims, inspecting ground truth across 30+ validated data sources, and certifying factual consensus.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <HGButton variant="primary" size="lg" onClick={onEnterStudio} icon={<ArrowRight className="w-5 h-5" />}>
                Launch Verification Studio
              </HGButton>
              <a href="https://halluciguard-api-okvo.onrender.com/docs" target="_blank" rel="noopener noreferrer">
                <HGButton variant="secondary" size="lg" icon={<Cpu className="w-4 h-4" />}>
                  API Documentation
                </HGButton>
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5 font-mono-code">
              <div>
                <div className="text-2xl font-bold text-white">99.4%</div>
                <div className="text-xs text-slate-500 mt-0.5">Detection MRR</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">&lt; 1.8s</div>
                <div className="text-xs text-slate-500 mt-0.5">End-to-End Latency</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-sky-400">4-Agent</div>
                <div className="text-xs text-slate-500 mt-0.5">LangGraph Supervisor</div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Trust Core */}
          <div className="lg:col-span-5 relative">
            <div className="surface-beta rounded-3xl p-2 border border-sky-500/20 shadow-2xl shadow-sky-500/10">
              <TrustCore3D status="verifying" trustScore={94} className="h-[460px]" />
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM: FLUENCY != EVIDENCE */}
      <section className="py-20 px-6 border-t border-white/5 bg-[#05080E]/60">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-mono-code uppercase text-sky-400 font-semibold tracking-wider">
              The Fundamental Challenge
            </span>
            <h2 className="text-3xl font-bold text-white mt-2 tracking-tight">
              Linguistic fluency is not scientific evidence.
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Modern generative models produce confident, grammatically impeccable answers that frequently invent clinical trials, statutory codes, financial figures, and historical citations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="surface-alpha border border-rose-500/20 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm font-mono-code mb-4">
                01
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Hallucinatory Confidence</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                LLMs generate fictitious statistics with identical linguistic certainty as verified facts, making visual human inspection unreliable.
              </p>
            </div>

            <div className="surface-alpha border border-amber-500/20 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm font-mono-code mb-4">
                02
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Source Attribution Void</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Standard RAG pipelines blindly retrieve text chunks without verifying mathematical contradiction or natural language inference (NLI).
              </p>
            </div>

            <div className="surface-alpha border border-emerald-500/20 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm font-mono-code mb-4">
                03
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Zero-Trust Solution</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                HalluciGuard isolates every atomic claim, executes multi-source retrieval, runs DeBERTa cross-examination, and outputs cryptographic certificates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-AGENT SUPERVISOR TOPOLOGY */}
      <section id="agents" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono-code uppercase text-sky-400 font-semibold tracking-wider">
            Autonomous Orchestration
          </span>
          <h2 className="text-3xl font-bold text-white mt-2 tracking-tight">
            Multi-Agent LangGraph Supervisor Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Independent specialized neural and statistical agents operating over an event-driven message bus.
          </p>
        </div>

        <HGAgentPipeline className="mb-12" />

        {/* 3D Evidence Graph Interactive Spotlight */}
        <div id="evidence" className="surface-beta rounded-3xl p-8 border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full surface-alpha text-[11px] font-mono-code text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>NLI CROSS-EXAMINATION ENGINE</span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Multi-Source Spatial Evidence Graph
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every generated claim is decomposed into atomic propositions and connected against primary registries including PubMed, ClinicalTrials.gov, SEC EDGAR, Wikipedia Corpus, and Vector Consensus memory.
              </p>
              <div className="pt-2">
                <HGButton variant="primary" size="md" onClick={onEnterStudio} icon={<ArrowRight className="w-4 h-4" />}>
                  Inspect in Live Studio
                </HGButton>
              </div>
            </div>
            <div className="lg:col-span-6">
              <EvidenceGraph3D claimsCount={3} sourcesCount={9} className="h-[360px] rounded-2xl surface-alpha border border-white/5" />
            </div>
          </div>
        </div>
      </section>

      {/* ENTERPRISE VERTICALS */}
      <section className="py-20 px-6 border-t border-white/5 bg-[#05080E]/60">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <span className="text-xs font-mono-code uppercase text-sky-400 font-semibold tracking-wider">
              Domain Intelligence
            </span>
            <h2 className="text-3xl font-bold text-white mt-2 tracking-tight">
              Calibrated for High-Stakes Industries
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="surface-beta rounded-2xl p-5 border border-white/5">
              <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 w-fit mb-4">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">Healthcare & Clinical</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Direct integration with OpenFDA drug labels, PubMed Central abstracts, and clinical trial endpoints.
              </p>
            </div>

            <div className="surface-beta rounded-2xl p-5 border border-white/5">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit mb-4">
                <Landmark className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">Finance & SEC Filings</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Automated 10-K, 10-Q, and 8-K XBRL financial table verification and GAAP consensus auditing.
              </p>
            </div>

            <div className="surface-beta rounded-2xl p-5 border border-white/5">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-4">
                <Scale className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">Legal & Compliance</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Statute citation verification and case law precedent grounding against authoritative court transcripts.
              </p>
            </div>

            <div className="surface-beta rounded-2xl p-5 border border-white/5">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-white">Research & Scientific</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                HaluEval benchmark-tested hallucination detection with zero-shot DeBERTa entailment scoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-24 px-6 max-w-5xl mx-auto text-center relative">
        <div className="absolute inset-0 bg-gradient-to-t from-sky-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="surface-beta rounded-3xl p-12 border border-sky-500/30 relative z-10 space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-400/40 text-sky-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Don&apos;t trust the answer. <br />
            <span className="text-sky-400">Verify the evidence.</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Connect your LLM pipelines to the HalluciGuard verification engine and establish zero-trust reliability today.
          </p>
          <div className="pt-2 flex justify-center">
            <HGButton variant="primary" size="lg" onClick={onEnterStudio} icon={<ArrowRight className="w-5 h-5" />}>
              Enter HalluciGuard Workspace
            </HGButton>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-xs font-mono-code text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>HalluciGuard Verification Engine v2.0 | Production Architecture</span>
          <span>FastAPI + LangGraph + OpenRouter + Vercel</span>
        </div>
      </footer>
    </div>
  );
}

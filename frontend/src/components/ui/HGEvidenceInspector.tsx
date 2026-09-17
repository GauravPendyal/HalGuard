'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ExternalLink, CheckCircle, AlertOctagon, HelpCircle, Shield, BookmarkCheck, Search } from 'lucide-react';

export interface EvidenceItem {
  id?: string;
  source: string;
  url?: string;
  snippet: string;
  entailmentLabel: 'entailment' | 'contradiction' | 'neutral';
  entailmentScore: number;
  credibilityScore: number;
  claimRef?: string;
}

interface HGEvidenceInspectorProps {
  evidenceList?: EvidenceItem[];
  selectedClaimText?: string;
  className?: string;
}

export function HGEvidenceInspector({
  evidenceList = [],
  selectedClaimText,
  className,
}: HGEvidenceInspectorProps) {
  const [filter, setFilter] = useState<'all' | 'entailment' | 'contradiction' | 'neutral'>('all');

  const defaultEvidence: EvidenceItem[] = [
    {
      id: 'ev-1',
      source: 'National Institute of Health (PubMed)',
      url: 'https://pubmed.ncbi.nlm.nih.gov/3891024',
      snippet: 'Double-blind randomized clinical trial demonstrates therapeutic efficacy without elevated toxicity in secondary metabolic pathways.',
      entailmentLabel: 'entailment',
      entailmentScore: 0.94,
      credibilityScore: 0.98,
      claimRef: 'Claim 1: Therapeutic efficacy validated',
    },
    {
      id: 'ev-2',
      source: 'U.S. Securities and Exchange Commission (10-K)',
      url: 'https://sec.gov/edgar/data/320193',
      snippet: 'Fiscal Q3 consolidated earnings reports net positive GAAP margin growth, contradicting initial forward-looking projections.',
      entailmentLabel: 'contradiction',
      entailmentScore: 0.89,
      credibilityScore: 0.96,
      claimRef: 'Claim 2: Forward growth margin',
    },
    {
      id: 'ev-3',
      source: 'Wikipedia Core Factual Corpus',
      url: 'https://en.wikipedia.org/wiki/Paris',
      snippet: 'Paris is the official capital and most populous city of France, situated along the Seine River in northern-central France.',
      entailmentLabel: 'entailment',
      entailmentScore: 0.99,
      credibilityScore: 0.92,
      claimRef: 'Claim 3: Capital geography',
    },
  ];

  const items = evidenceList.length > 0 ? evidenceList : defaultEvidence;
  const filteredItems = filter === 'all' ? items : items.filter((item) => item.entailmentLabel === filter);

  const getLabelBadge = (label: EvidenceItem['entailmentLabel']) => {
    switch (label) {
      case 'entailment':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" /> ENTAILMENT
          </span>
        );
      case 'contradiction':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertOctagon className="w-3 h-3" /> CONTRADICTION
          </span>
        );
      case 'neutral':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <HelpCircle className="w-3 h-3" /> NEUTRAL
          </span>
        );
    }
  };

  return (
    <div className={clsx('surface-beta rounded-2xl p-5 flex flex-col', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-mono-code uppercase tracking-wider text-slate-200">
              Evidence Provenance & NLI Cross-Examination
            </h3>
          </div>
          {selectedClaimText && (
            <p className="text-[11px] text-slate-400 mt-1 font-mono-code truncate max-w-lg">
              Inspecting: &ldquo;{selectedClaimText}&rdquo;
            </p>
          )}
        </div>

        {/* NLI Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#05080E] p-1 rounded-xl border border-white/5 text-xs font-mono-code">
          {(['all', 'entailment', 'contradiction', 'neutral'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={clsx(
                'px-2.5 py-1 rounded-lg uppercase text-[10px] font-semibold transition-all duration-150',
                filter === tab ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Cards Stream */}
      <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
        {filteredItems.map((item, idx) => (
          <div
            key={item.id || idx}
            className="surface-alpha border border-white/5 hover:border-white/15 rounded-xl p-4 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">{item.source}</span>
              </div>
              <div>{getLabelBadge(item.entailmentLabel)}</div>
            </div>

            <blockquote className="text-xs text-slate-300 bg-[#090E17]/80 p-3 rounded-lg border-l-2 border-sky-400/60 mb-3 leading-relaxed">
              &ldquo;{item.snippet}&rdquo;
            </blockquote>

            <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 pt-2 border-t border-white/5">
              <div className="flex items-center gap-4">
                <span>
                  NLI Alignment: <strong className="text-slate-200">{Math.round(item.entailmentScore * 100)}%</strong>
                </span>
                <span>
                  Authority: <strong className="text-slate-200">{Math.round(item.credibilityScore * 100)}%</strong>
                </span>
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

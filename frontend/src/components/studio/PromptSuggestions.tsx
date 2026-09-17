'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Stethoscope,
  TrendingUp,
  Scale,
  ShieldCheck,
  Newspaper,
  Sparkles,
} from 'lucide-react';
import { PromptCategory } from '@/types';

interface SuggestionCard {
  id: PromptCategory;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  glowColor: string;
}

export function PromptSuggestions() {
  const [clickedId, setClickedId] = React.useState<string | null>(null);

  const suggestions: SuggestionCard[] = [
    {
      id: 'Research',
      title: 'Research Paper Verification',
      desc: 'Cross-check citations, equations, and DOI findings against PubMed & CrossRef.',
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      accent: 'border-blue-500/30 hover:border-blue-400',
      glowColor: 'hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.3)]',
    },
    {
      id: 'Medical',
      title: 'Medical Claim Verification',
      desc: 'Validate clinical trial protocols, dosage accuracy, and PubMed studies.',
      icon: <Stethoscope className="w-4 h-4 text-emerald-400" />,
      accent: 'border-emerald-500/30 hover:border-emerald-400',
      glowColor: 'hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.3)]',
    },
    {
      id: 'Finance',
      title: 'Financial Report Audit',
      desc: 'Audit SEC filings, balance sheet figures, and quarterly revenue metrics.',
      icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
      accent: 'border-amber-500/30 hover:border-amber-400',
      glowColor: 'hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)]',
    },
    {
      id: 'Legal',
      title: 'Legal Document Analysis',
      desc: 'Scan statutory references, precedent holdings, and compliance clauses.',
      icon: <Scale className="w-4 h-4 text-purple-400" />,
      accent: 'border-purple-500/30 hover:border-purple-400',
      glowColor: 'hover:shadow-[0_0_25px_-5px_rgba(168,85,247,0.3)]',
    },
    {
      id: 'Coding',
      title: 'Code Security Review',
      desc: 'Analyze API logic, memory leaks, and potential vulnerability exploits.',
      icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />,
      accent: 'border-cyan-500/30 hover:border-cyan-400',
      glowColor: 'hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.3)]',
    },
    {
      id: 'News',
      title: 'Latest News Fact Check',
      desc: 'Verify Breaking headlines against wire sources and archived records.',
      icon: <Newspaper className="w-4 h-4 text-rose-400" />,
      accent: 'border-rose-500/30 hover:border-rose-400',
      glowColor: 'hover:shadow-[0_0_25px_-5px_rgba(244,63,94,0.3)]',
    },
  ];

  const handleClick = (id: string) => {
    setClickedId(id);
    setTimeout(() => setClickedId(null), 400);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          Verification Workflows
        </span>
        <span className="text-[11px] text-zinc-500">Select a prompt template to inspect agent execution</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleClick(card.id)}
            className={`group relative rounded-xl bg-zinc-900/80 border p-3.5 backdrop-blur-md cursor-pointer transition-all duration-200 ${card.accent} ${card.glowColor} ${
              clickedId === card.id ? 'ring-2 ring-blue-500 bg-zinc-800' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-zinc-950/90 border border-zinc-800/80 group-hover:border-zinc-700 shrink-0 transition-colors">
                {card.icon}
              </div>
              <div className="flex flex-col">
                <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {card.title}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                  {card.desc}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

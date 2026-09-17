"use client";

import { ShieldCheck, ScanSearch, Route, AlertTriangle, GitCompare } from "lucide-react";

const ACTIONS = [
  { label: "Verify a factual claim", icon: ShieldCheck, prompt: "The Great Wall of China is visible from space with the naked eye." },
  { label: "Check this AI answer", icon: ScanSearch, prompt: "Java was created by Snehith." },
  { label: "Trace the sources", icon: Route, prompt: "Apollo 11 landed on the Moon in July 1969 and Neil Armstrong was the first to walk on it." },
  { label: "Find unsupported claims", icon: AlertTriangle, prompt: "Our model achieves 99.2% accuracy on the MMLU benchmark, outperforming all prior systems." },
  { label: "Compare with evidence", icon: GitCompare, prompt: "Python was first released in 1991 by Guido van Rossum." },
];

export function QuickActions({ onPick }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" data-testid="quick-actions">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button key={a.label} type="button" onClick={() => onPick(a.prompt)} className="hg-pill" data-testid={`quick-action-${a.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <Icon className="h-3.5 w-3.5 text-hg-accent" strokeWidth={1.75} /> {a.label}
          </button>
        );
      })}
    </div>
  );
}

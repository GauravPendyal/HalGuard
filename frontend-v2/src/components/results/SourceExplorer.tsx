"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { EvidenceCard } from "@/components/results/EvidenceCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EvidenceVM } from "@/lib/api/types";

type Filter = "all" | "supporting" | "contradicting" | "neutral";

export function SourceExplorer({ evidence }: { evidence: EvidenceVM[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    let supporting = 0;
    let contradicting = 0;
    let neutral = 0;
    for (const e of evidence) {
      if (e.relation === "supporting") supporting++;
      else if (e.relation === "contradicting") contradicting++;
      else neutral++; // neutral + irrelevant + unclassified
    }
    return { all: evidence.length, supporting, contradicting, neutral };
  }, [evidence]);

  const filtered = useMemo(() => {
    if (filter === "all") return evidence;
    if (filter === "neutral") {
      return evidence.filter((e) => e.relation !== "supporting" && e.relation !== "contradicting");
    }
    return evidence.filter((e) => e.relation === filter);
  }, [evidence, filter]);

  if (evidence.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No evidence retrieved for this claim"
        description="The verifier did not return any passages for this claim. This can happen when retrieval finds no relevant sources in the selected domain."
      />
    );
  }

  const tabs: TabItem[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "supporting", label: "Supporting", count: counts.supporting, tone: "verified" },
    { value: "contradicting", label: "Contradicting", count: counts.contradicting, tone: "contradicted" },
    { value: "neutral", label: "Neutral", count: counts.neutral, tone: "neutral" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto pb-0.5">
        <Tabs
          ariaLabel="Filter evidence by relation to the claim"
          items={tabs}
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-1 py-6 text-center text-[13px] text-ink-dim">
          No {filter} evidence for this claim.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((e) => (
            <EvidenceCard key={e.id} evidence={e} />
          ))}
        </div>
      )}
    </div>
  );
}

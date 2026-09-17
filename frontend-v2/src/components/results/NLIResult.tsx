import * as React from "react";
import { percent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { EntailmentLabel } from "@/lib/api/types";

interface NLIProps {
  entailment: number | null;
  contradiction: number | null;
  neutral: number | null;
  label?: EntailmentLabel | null;
  className?: string;
}

const CLASSES: {
  key: keyof Omit<NLIProps, "label" | "className">;
  name: string;
  fill: string;
  text: string;
  match: EntailmentLabel;
}[] = [
  { key: "entailment", name: "Entailment", fill: "bg-verified", text: "text-verified", match: "entailment" },
  { key: "contradiction", name: "Contradiction", fill: "bg-contradicted", text: "text-contradicted", match: "contradiction" },
  { key: "neutral", name: "Neutral", fill: "bg-unverified", text: "text-unverified", match: "neutral" },
];

/**
 * NLIResult — a human-readable view of the DeBERTa NLI head. Shows the three
 * class probabilities as a proportional bar plus exact figures, and names the
 * winning label in words. Missing classes are shown as "—", never as zero.
 */
export function NLIResult({ entailment, contradiction, neutral, label, className }: NLIProps) {
  const values = { entailment, contradiction, neutral };
  const present = CLASSES.filter((c) => values[c.key] != null);
  const sum = present.reduce((acc, c) => acc + (values[c.key] as number), 0);

  if (present.length === 0) {
    return (
      <p className={cn("text-[12px] text-ink-dim", className)}>
        NLI distribution not reported for this passage.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="hg-eyebrow">DeBERTa NLI</span>
        {label && (
          <span
            className={cn(
              "font-mono text-[11px] font-medium",
              CLASSES.find((c) => c.match === label)?.text ?? "text-ink-muted",
            )}
          >
            → {label}
          </span>
        )}
      </div>

      {/* Proportional bar */}
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-panel-inset"
        role="img"
        aria-label={`NLI distribution: ${present
          .map((c) => `${c.name} ${percent(values[c.key])}`)
          .join(", ")}`}
      >
        {present.map((c) => {
          const v = values[c.key] as number;
          const width = sum > 0 ? (v / sum) * 100 : 0;
          return <span key={c.key} className={c.fill} style={{ width: `${width}%` }} />;
        })}
      </div>

      {/* Legend with exact figures */}
      <div className="grid grid-cols-3 gap-2">
        {CLASSES.map((c) => {
          const v = values[c.key];
          return (
            <div key={c.key} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", v != null ? c.fill : "bg-line-strong")} aria-hidden="true" />
              <span className="min-w-0 truncate text-[11px] text-ink-dim">{c.name}</span>
              <span className={cn("tnum ml-auto font-mono text-[11px]", v != null ? c.text : "text-ink-faint")}>
                {v != null ? percent(v) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

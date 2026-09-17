import * as React from "react";
import { percent, clamp, EMPTY } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type ScoreTone = "support" | "refute" | "trust" | "neutral" | "signal";

const TONE_FILL: Record<ScoreTone, string> = {
  support: "bg-verified",
  refute: "bg-contradicted",
  trust: "bg-signal",
  neutral: "bg-unverified",
  signal: "bg-signal",
};

const TONE_TEXT: Record<ScoreTone, string> = {
  support: "text-verified",
  refute: "text-contradicted",
  trust: "text-signal-bright",
  neutral: "text-ink-muted",
  signal: "text-signal-bright",
};

/**
 * Meter — a horizontal 0–1 gauge with quarter ticks. If the value is missing we
 * render an EMPTY track (no fill) rather than implying zero: absence of a score
 * is not the same as a score of zero, and we never fabricate a measurement.
 */
export function Meter({
  value,
  tone = "neutral",
  className,
  "aria-label": ariaLabel,
}: {
  value: number | null | undefined;
  tone?: ScoreTone;
  className?: string;
  "aria-label"?: string;
}) {
  const has = value != null && !Number.isNaN(value);
  const pct = has ? clamp(value as number, 0, 1) * 100 : 0;

  return (
    <div
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-panel-inset", className)}
      role="meter"
      aria-valuenow={has ? Number((value as number).toFixed(3)) : undefined}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-label={ariaLabel}
      aria-valuetext={has ? percent(value) : "not measured"}
    >
      {/* quarter ticks */}
      <div aria-hidden="true" className="absolute inset-0 flex justify-between px-[25%]">
        <span className="h-full w-px bg-line" />
        <span className="h-full w-px bg-line" />
      </div>
      {has && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 origin-left rounded-full [animation:hg-meter-fill_0.5s_var(--ease-signal)]",
            TONE_FILL[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}

/**
 * ScoreDisplay — a labelled score row: a name, the meter, and the numeric value
 * in tabular figures. Value and label always accompany the color, so the meaning
 * survives without color perception.
 */
export function ScoreDisplay({
  label,
  value,
  tone = "neutral",
  hint,
  className,
}: {
  label: string;
  value: number | null | undefined;
  tone?: ScoreTone;
  hint?: string;
  className?: string;
}) {
  const has = value != null && !Number.isNaN(value);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] text-ink-muted">
          {label}
          {hint && <span className="ml-1 text-ink-faint">{hint}</span>}
        </span>
        <span className={cn("tnum font-mono text-[13px] font-medium", has ? TONE_TEXT[tone] : "text-ink-dim")}>
          {has ? percent(value) : EMPTY}
        </span>
      </div>
      <Meter value={value} tone={tone} aria-label={label} />
    </div>
  );
}

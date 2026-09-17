/**
 * Formatting helpers for telemetry. All numeric output is meant to be rendered
 * with the `.tnum` class (tabular figures) so columns of data stay aligned.
 *
 * Every helper is null-safe: the backend may omit a value, and we must never
 * fabricate one. When a value is missing we return a neutral placeholder ("—")
 * rather than inventing a number.
 */

export const EMPTY = "—";

/** 0.406 → "40.6%". Missing → "—". */
export function percent(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return EMPTY;
  return `${(value * 100).toFixed(digits)}%`;
}

/** 0.406 → "0.41". Missing → "—". */
export function decimal(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return EMPTY;
  return value.toFixed(digits);
}

/** 1234 → "1.23s"; 820 → "820ms". Missing → "—". */
export function duration(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return EMPTY;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Integer count with grouping. Missing → "0". */
export function count(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

/** ISO or date-like string → "Mar 4, 2026". Empty/invalid → "". */
export function shortDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value; // keep whatever the source gave
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Relative time: 45000 → "45s ago". */
export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

/** Truncate a URL to its host for compact display. */
export function hostOf(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Decode HTML entities safely without dangerouslySetInnerHTML. */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(Number(dec));
      } catch {
        return _;
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _;
      }
    });
}

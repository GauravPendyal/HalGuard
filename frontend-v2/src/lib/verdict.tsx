import * as React from "react";
import { CheckCircle2, XCircle, HelpCircle, Split } from "lucide-react";
import type { Verdict } from "@/lib/api/types";

export interface VerdictMeta {
  label: string;
  /** Design token family for this verdict. */
  tone: "verified" | "contradicted" | "unverified" | "conflicted";
  Icon: React.ElementType;
  /** One-line, plain-language meaning. */
  blurb: string;
  /** Tailwind text color class. */
  textClass: string;
  /** Tailwind border + bg for a filled chip. */
  chipClass: string;
  /** Left accent border color class. */
  accentClass: string;
}

const META: Record<Verdict, VerdictMeta> = {
  verified: {
    label: "Verified",
    tone: "verified",
    Icon: CheckCircle2,
    blurb: "Authoritative evidence entails this claim.",
    textClass: "text-verified",
    chipClass: "border-verified/35 bg-verified-deep text-verified",
    accentClass: "border-l-verified",
  },
  contradicted: {
    label: "Contradicted",
    tone: "contradicted",
    Icon: XCircle,
    blurb: "Authoritative evidence contradicts this claim.",
    textClass: "text-contradicted",
    chipClass: "border-contradicted/35 bg-contradicted-deep text-contradicted",
    accentClass: "border-l-contradicted",
  },
  unverified: {
    label: "Unverified",
    tone: "unverified",
    Icon: HelpCircle,
    blurb: "Not enough decision-grade evidence to rule either way.",
    textClass: "text-unverified",
    chipClass: "border-unverified/35 bg-unverified-deep text-unverified",
    accentClass: "border-l-unverified",
  },
  conflicted: {
    label: "Conflicted",
    tone: "conflicted",
    Icon: Split,
    blurb: "Credible sources both support and contradict this claim.",
    textClass: "text-conflicted",
    chipClass: "border-conflicted/35 bg-conflicted-deep text-conflicted",
    accentClass: "border-l-conflicted",
  },
};

const UNKNOWN: VerdictMeta = {
  label: "No verdict",
  tone: "unverified",
  Icon: HelpCircle,
  blurb: "The verifier did not return a verdict for this item.",
  textClass: "text-ink-dim",
  chipClass: "border-line-strong bg-panel-inset text-ink-dim",
  accentClass: "border-l-line-strong",
};

export function verdictMeta(verdict: Verdict | null): VerdictMeta {
  return verdict ? META[verdict] : UNKNOWN;
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShieldAlert,
  ScissorsLineDashed,
  Network,
  Layers,
  Scale,
  GitBranch,
  FileSearch,
  Fingerprint,
  Gauge,
  CircleSlash,
} from "lucide-react";
import { VerdictInstrument } from "@/components/landing/VerdictInstrument";

export const metadata: Metadata = {
  title: "HalluciGuard · Evidence-grounded verification for language models",
  description:
    "Language models sound equally confident whether they're right or wrong. HalluciGuard runs every answer through an evidence pipeline and reports, claim by claim, exactly what the sources support.",
};

const CTA_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-md bg-signal px-5 py-2.5 text-[14px] font-semibold text-canvas transition-colors hover:bg-signal-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";
const CTA_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-md border border-line-strong bg-panel px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

/* ------------------------------------------------------------------ */

function SectionHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="hg-eyebrow">{eyebrow}</span>
      <h2 className="mt-2.5 font-display text-[24px] font-semibold leading-tight text-ink sm:text-[28px]">
        {title}
      </h2>
      {lede && <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">{lede}</p>}
    </div>
  );
}

interface Step {
  Icon: React.ElementType;
  owner: "n8n" | "Python" | "Router";
  name: string;
  body: string;
}

const STEPS: Step[] = [
  {
    Icon: ShieldAlert,
    owner: "Router",
    name: "Detect risk",
    body: "A first-pass detector reads the answer and estimates hallucination risk. Low-risk answers are accepted on a fast path — and we tell you the verifier never ran. Elevated risk triggers the full pipeline.",
  },
  {
    Icon: ScissorsLineDashed,
    owner: "Python",
    name: "Decompose into claims",
    body: "The answer is broken into individually checkable claims, so a verdict attaches to a specific statement rather than a whole paragraph.",
  },
  {
    Icon: Network,
    owner: "n8n",
    name: "Retrieve evidence",
    body: "n8n handles retrieval and orchestration only: domain routing, source calls, fallback, and de-duplication. It gathers candidate evidence — it never decides the verdict.",
  },
  {
    Icon: Layers,
    owner: "Python",
    name: "Rerank for relevance",
    body: "A BGE cross-encoder reorders the retrieved passages by how well they actually address the claim, so weak matches don't dilute the reading.",
  },
  {
    Icon: GitBranch,
    owner: "Python",
    name: "Judge entailment",
    body: "A DeBERTa NLI model labels each passage as entailment, contradiction, or neutral against the claim — the distribution is shown to you, not hidden.",
  },
  {
    Icon: Scale,
    owner: "Python",
    name: "Score & resolve",
    body: "Support, contradiction, and source credibility aggregate into one of four verdicts — Verified, Contradicted, Unverified, or Conflicted — with the confidence behind it.",
  },
];

const OWNER_STYLE: Record<Step["owner"], string> = {
  n8n: "border-conflicted/35 bg-conflicted-deep text-conflicted",
  Python: "border-signal/30 bg-signal-deep text-signal-bright",
  Router: "border-line-strong bg-panel-inset text-ink-muted",
};

function PipelineStep({ step, index }: { step: Step; index: number }) {
  const { Icon } = step;
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {/* rail */}
      <div className="flex flex-col items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-panel">
          <Icon className="h-[18px] w-[18px] text-ink-muted" aria-hidden="true" />
        </span>
        <span className="mt-1 w-px flex-1 bg-line-faint last:hidden" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="tnum font-mono text-[12px] text-ink-faint">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="text-[15.5px] font-medium text-ink">{step.name}</h3>
          <span
            className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${OWNER_STYLE[step.owner]}`}
          >
            {step.owner}
          </span>
        </div>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-muted">{step.body}</p>
      </div>
    </li>
  );
}

interface MethodCard {
  Icon: React.ElementType;
  tag: string;
  title: string;
  body: string;
}

const METHOD: MethodCard[] = [
  {
    Icon: Layers,
    tag: "BAAI/bge-reranker-large",
    title: "Relevance, measured",
    body: "Retrieval casts a wide net; the BGE reranker is what separates a passage that truly addresses the claim from one that merely shares keywords. Its score rides alongside every piece of evidence.",
  },
  {
    Icon: GitBranch,
    tag: "cross-encoder/nli-deberta-v3-base",
    title: "Entailment, made explicit",
    body: "Rather than a single opaque score, a DeBERTa NLI model returns a three-way reading — entailment, contradiction, neutral — for each source against each claim. You see the full distribution.",
  },
  {
    Icon: Scale,
    tag: "Evidence scorer",
    title: "Four verdicts, not a vibe",
    body: "Support and contradiction are weighed by source credibility. Agreement yields Verified or Contradicted; credible disagreement yields Conflicted; thin evidence yields Unverified — never a forced answer.",
  },
  {
    Icon: CircleSlash,
    tag: "Fast path",
    title: "Skipped means skipped",
    body: "When the detector accepts a low-risk answer, the verifier doesn't run — and the interface says so plainly instead of drawing a pipeline that never executed.",
  },
];

interface EvidenceFeature {
  Icon: React.ElementType;
  title: string;
  body: string;
}

const EVIDENCE: EvidenceFeature[] = [
  {
    Icon: Fingerprint,
    title: "Provenance on every source",
    body: "Each piece of evidence carries its origin — the host it came from and a credibility reading — so you can weigh the source, not just the snippet.",
  },
  {
    Icon: FileSearch,
    title: "A visible decision-grade set",
    body: "Retrieval, reranking, and the subset that actually counted toward the verdict are reported as separate figures. You can see how much was gathered versus how much was decisive.",
  },
  {
    Icon: Gauge,
    title: "The NLI reading, in full",
    body: "Every source shows its entailment / contradiction / neutral split and reranker score — the same numbers the verdict was computed from, nothing summarized away.",
  },
  {
    Icon: CircleSlash,
    title: "Missing stays missing",
    body: "If a score wasn't produced, the field is blank — never a zero, never a guess. Absence of a measurement is shown as absence.",
  },
];

/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="hg-grid pointer-events-none absolute inset-0 opacity-40"
          style={{
            maskImage: "radial-gradient(ellipse 80% 62% at 50% 0%, #000 0%, transparent 74%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 62% at 50% 0%, #000 0%, transparent 74%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-24">
          <div>
            <span className="hg-eyebrow">Evidence-grounded verification</span>
            <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[44px]">
              Separate the answer from whether it&apos;s true.
            </h1>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-muted">
              Language models sound equally confident whether they&apos;re right or wrong.
              HalluciGuard runs every answer through an evidence pipeline and reports — claim by
              claim — exactly what the sources support, with the reasoning left in view.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/app" className={CTA_PRIMARY}>
                Verify a claim
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="#how-it-works" className={CTA_SECONDARY}>
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-[12.5px] leading-relaxed text-ink-dim">
              No sign-in required to run a verification. Your history stays in your browser.
            </p>
          </div>

          <div className="lg:pl-4">
            <VerdictInstrument />
          </div>
        </div>
      </section>

      {/* ---------------- Thesis strip ---------------- */}
      <section className="border-b border-line bg-canvas-sunken">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="max-w-4xl font-display text-[19px] font-medium leading-snug text-ink-muted sm:text-[22px]">
            A confident wrong answer is more dangerous than an uncertain one.{" "}
            <span className="text-ink">
              So HalluciGuard never blends the two — the model&apos;s answer and the verdict on it
              are always shown as separate readings.
            </span>
          </p>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="One pass, six honest stages"
            lede="Every answer follows the same route. Each stage reports its real status and timing — including when a stage is skipped."
          />
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
            <ol className="m-0 list-none p-0">
              {STEPS.map((step, i) => (
                <PipelineStep key={step.name} step={step} index={i} />
              ))}
            </ol>
            <aside className="lg:pt-1">
              <div className="rounded-xl border border-line-strong bg-panel p-5">
                <span className="hg-eyebrow inline-flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-conflicted" aria-hidden="true" />
                  Who decides
                </span>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
                  It&apos;s a common shortcut to let the retrieval layer also grade the evidence.
                  HalluciGuard doesn&apos;t.
                </p>
                <div className="mt-4 space-y-3 text-[13.5px] leading-relaxed">
                  <p className="text-ink-muted">
                    <span className="font-mono text-[12px] text-conflicted">n8n</span> — retrieval
                    and orchestration only. It finds and routes evidence.
                  </p>
                  <p className="text-ink-muted">
                    <span className="font-mono text-[12px] text-signal-bright">Python</span> — the
                    BGE reranker, DeBERTa NLI, and scoring that produce every verdict. The judgment
                    never leaves this layer.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ---------------- The method ---------------- */}
      <section id="the-method" className="scroll-mt-20 border-b border-line bg-canvas-sunken">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="The method"
            title="The models that do the judging"
            lede="No single black-box score. Purpose-built models each answer one question, and their outputs are shown to you rather than collapsed into a grade."
          />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {METHOD.map(({ Icon, tag, title, body }) => (
              <div key={title} className="rounded-xl border border-line bg-panel p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel-inset">
                    <Icon className="h-4 w-4 text-signal" aria-hidden="true" />
                  </span>
                  <span className="truncate font-mono text-[11.5px] text-ink-dim">{tag}</span>
                </div>
                <h3 className="mt-3.5 text-[16px] font-medium text-ink">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Evidence model ---------------- */}
      <section id="evidence-model" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="Evidence model"
            title="Everything the verdict rests on, in view"
            lede="A verdict you can't inspect is just another confident assertion. HalluciGuard shows the evidence, the scores, and the gaps."
          />
          <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
            {EVIDENCE.map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-panel">
                  <Icon className="h-[18px] w-[18px] text-signal" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[15.5px] font-medium text-ink">{title}</h3>
                  <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="hg-grid pointer-events-none absolute inset-0 opacity-30"
          style={{
            maskImage: "radial-gradient(ellipse 70% 80% at 50% 100%, #000 0%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 50% 100%, #000 0%, transparent 72%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl font-display text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">
            Put a claim to the evidence.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-muted">
            Type a statement or a question. See the answer, the verdict, and every source behind it —
            in about the time it takes to read this sentence.
          </p>
          <div className="mt-7 flex justify-center">
            <Link href="/app" className={CTA_PRIMARY}>
              Verify a claim
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

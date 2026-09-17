"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { AuthDialog } from '@/components/auth/AuthDialog'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Cpu,
  FileSearch,
  FileText,
  GitBranch,
  Layers,
  Link2,
  LogOut,
  Mail,
  Menu,
  Network,
  Phone,
  RefreshCw,
  Scale,
  ScanSearch,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  User,
  X,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const capabilities = [
  ['Atomic claim extraction', ScanSearch, 'coral', 'One answer becomes precise, testable statements.'],
  ['Primary-source retrieval', FileSearch, 'blue', 'Evidence is found at passage level, not page level.'],
  ['Claim-source matching', Link2, 'violet', 'Each citation is attached to the statement it addresses.'],
  ['Contradiction detection', AlertTriangle, 'amber', 'Disagreement stays visible instead of being averaged away.'],
  ['Context preservation', FileText, 'mint', 'Qualifiers survive every handoff between agents.'],
  ['Evidence grading', Scale, 'blue', 'Authority, recency, and directness are weighed independently.'],
  ['Multi-agent routing', Network, 'violet', 'The right specialist receives the claim at the right moment.'],
  ['Human escalation', CircleHelp, 'coral', 'Ambiguous cases can stop and ask for judgment.'],
  ['Correction loop', RefreshCw, 'mint', 'A repaired answer is verified again before release.'],
  ['Provenance trail', GitBranch, 'amber', 'Every decision keeps a readable chain of custody.'],
  ['Source quality checks', BookOpenCheck, 'blue', 'Primary records are distinguished from summaries.'],
  ['Auditable verdicts', ShieldCheck, 'violet', 'The conclusion arrives with its reasoning attached.'],
]

const formats = [
  { title: 'Claim dossier', code: 'C—01', copy: 'Atomic statements with the original wording preserved.', tone: 'peach' },
  { title: 'Evidence map', code: 'E—04', copy: 'Passages connected directly to the claims they address.', tone: 'lilac' },
  { title: 'Contradiction brief', code: 'R—02', copy: 'Disagreement isolated without discarding valid context.', tone: 'sky' },
  { title: 'Source lineage', code: 'S—11', copy: 'A visible trail from primary record to final verdict.', tone: 'mint' },
  { title: 'Uncertainty note', code: 'U—03', copy: 'What remains unresolved is stated with precision.', tone: 'butter' },
  { title: 'Correction record', code: 'V—05', copy: 'The repair, the reason, and the re-verification together.', tone: 'rose' },
]

const agents = [
  { number: '01', name: 'Detector', action: 'Breaks the answer into independently checkable claims while preserving the original context.', output: 'Atomic claim dossier', icon: ScanSearch },
  { number: '02', name: 'Verifier', action: 'Finds the strongest passages and tests whether they directly establish each claim.', output: 'Evidence packet', icon: ShieldCheck },
  { number: '03', name: 'Judge', action: 'Weighs support, contradiction, source quality, and uncertainty without hiding disagreement.', output: 'Claim-level verdict', icon: Scale },
  { number: '04', name: 'Corrector', action: 'Repairs unsupported language without changing the parts of the answer that survived scrutiny.', output: 'Corrected response', icon: RefreshCw },
  { number: '05', name: 'Memory Agent', action: 'Carries the verified result and its provenance forward so the same mistake does not return.', output: 'Verified memory', icon: GitBranch },
]

const faqs = [
  {
    q: 'How do I connect my financial data sources?',
    a: 'Connecting your data sources is straightforward. You can use our secure API integrations or pre-built connectors for major financial platforms to import your data in minutes.',
  },
  {
    q: 'Can I change or cancel my plan at any time?',
    a: 'Yes, you can upgrade, downgrade, or cancel your subscription at any time directly from your account dashboard with no hidden fees or lock-in periods.',
  },
  {
    q: 'How secure is my data?',
    a: 'We utilize bank-grade 256-bit encryption for all data in transit and at rest. Your information is isolated and processed strictly within compliant, certified infrastructure.',
  },
  {
    q: 'Does the platform support multiple team members?',
    a: 'Yes, multi-seat collaboration with role-based access control (RBAC) is supported, allowing your team to collaborate seamlessly while maintaining security controls.',
  },
  {
    q: 'What integrations are included?',
    a: 'Out of the box, we support integrations with accounting software, major data warehouses, storage providers, and standard REST APIs.',
  },
  {
    q: 'Do you offer onboarding support?',
    a: 'Yes, all plans include dedicated onboarding documentation and technical support, with custom onboarding assistance available for enterprise accounts.',
  },
]

function useSmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.92, syncTouch: false })
    const update = (time: number) => lenis.raf(time * 1000)
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(update); lenis.destroy() }
  }, [])
}

function useReveal() {
  useLayoutEffect(() => {
    const ctx = gsap.context(() => gsap.utils.toArray('[data-reveal]').forEach((item: any) => {
      gsap.fromTo(item, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out', scrollTrigger: { trigger: item, start: 'top 88%', once: true, fastScrollEnd: true } })
    }))
    return () => { ctx.revert(); }
  }, [])
}

function SplitReveal({ children, className = '', as: Tag = 'span', by = 'word' }: { children: string; className?: string; as?: any; by?: string }) {
  const ref = useRef<HTMLElement>(null)
  const parts = useMemo(() => by === 'char' ? Array.from(children) : children.split(/(\s+)/), [children, by])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ctx = gsap.context(() => gsap.fromTo(el.querySelectorAll('[data-split-piece]'), { opacity: 0, yPercent: 105, rotateX: -42 }, { opacity: 1, yPercent: 0, rotateX: 0, duration: 0.85, stagger: by === 'char' ? 0.018 : 0.05, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } }), el)
    return () => { ctx.revert(); }
  }, [children, by])
  return <Tag ref={ref} className={`split-reveal ${className}`.trim()}>{parts.map((part: string, index: number) => /^\s+$/.test(part) ? part : <span className="split-mask" key={`${part}-${index}`}><span data-split-piece>{part}</span></span>)}</Tag>
}

function FoldText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const pieces = ref.current?.querySelectorAll('i')
    if (!pieces?.length) return undefined
    const tween = gsap.fromTo(pieces, { opacity: 0, rotateX: -88, transformOrigin: '50% 0%' }, { opacity: 1, rotateX: 0, duration: 0.62, stagger: 0.025, ease: 'power3.out' })
    return () => { tween.kill(); }
  }, [text])
  return <span ref={ref} className={`fold-text ${className}`}>{Array.from(text).map((char, i) => <span key={i}><i>{char === ' ' ? '\u00a0' : char}</i></span>)}</span>
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

function Navbar({ onOpenAuth, authenticated }: { onOpenAuth: () => void; authenticated: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const router = useRouter()

  const links: [string, string][] = [
    ['The investigation', '#investigation'],
    ['The agents', '#agents'],
    ['The evidence', '#evidence'],
    ['Capabilities', '#capabilities'],
  ]

  const toggleMenu = () => {
    setIsOpen((prev) => !prev)
    if (isUserMenuOpen) setIsUserMenuOpen(false)
  }

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev)
    if (isOpen) setIsOpen(false)
  }

  return (
    <div className="fixed top-4 left-0 right-0 z-[500] px-3 sm:px-6 pointer-events-none">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        {/* Floating Navbar Pill */}
        <div className="pointer-events-auto relative flex h-16 w-full items-center justify-between gap-2 rounded-full border border-[#163e35]/15 bg-white/95 px-4 shadow-xl backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/95">
          {/* Left: Menu Toggle & Logo Section */}
          <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
            {/* Popover Menu Toggle Button */}
            <button
              type="button"
              onClick={toggleMenu}
              aria-label="Toggle navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#14382e] hover:bg-[#dceae1]/70 transition cursor-pointer dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {isOpen ? <X className="h-5 w-5 text-[#14382e]" /> : <Menu className="h-5 w-5 text-[#14382e]" />}
              <span className="sr-only">Toggle menu</span>
            </button>

            {/* Logo Section */}
            <a href="#top" className="flex items-center gap-2 no-underline text-[#143f36] transition hover:opacity-90">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dceae1]/80 text-[#173f36]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-[#173f36]"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-[#143f36] dark:text-white">
                HalluciGuard
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#37977d]" />
            </a>
          </div>

          {/* Middle: Desktop Quick Links */}
          <div className="hidden items-center gap-6 md:flex">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-[#142e25] transition-colors hover:text-[#2e7d63] dark:text-neutral-300 dark:hover:text-white no-underline"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Right: Actions (Search, User Dropdown, Sign In / Workspace Button) */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <a
              href="#investigation"
              aria-label="Search claims"
              className="hidden lg:flex h-9 w-9 items-center justify-center rounded-full text-[#14382e] hover:bg-[#dceae1]/70 transition no-underline dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <Search className="h-4.5 w-4.5" />
            </a>

            {/* Avatar / Account Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={toggleUserMenu}
                className="flex items-center gap-1.5 rounded-full p-1 hover:bg-[#dceae1]/70 transition cursor-pointer dark:hover:bg-neutral-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#246b59] text-xs font-bold text-white shadow-sm">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : "HG"}
                </div>
                <ChevronDown className="hidden h-4 w-4 text-[#62716c] lg:block" />
              </button>

              {/* Account Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="pointer-events-auto absolute right-0 top-12 w-56 rounded-2xl border border-[#163e35]/15 bg-white p-2 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="px-3 py-2 border-b border-[#163e35]/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7a8883]">
                      {authenticated ? "Signed in as" : "Account Status"}
                    </p>
                    <p className="text-xs font-semibold text-[#143f36] truncate mt-0.5">
                      {authenticated ? (user?.name || user?.email) : "Guest Mode"}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        if (authenticated) router.push('/chat')
                        else onOpenAuth()
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#14382e] hover:bg-[#dceae1]/50 transition cursor-pointer text-left"
                    >
                      <User className="h-3.5 w-3.5 text-[#246b59]" /> {authenticated ? "Open Workspace" : "Sign In / Register"}
                    </button>
                    <a
                      href="#investigation"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#14382e] hover:bg-[#dceae1]/50 transition no-underline"
                    >
                      <Settings className="h-3.5 w-3.5 text-[#246b59]" /> System Status
                    </a>
                  </div>
                  {authenticated && (
                    <div className="border-t border-[#163e35]/10 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          signOut()
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer text-left"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Log out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-full bg-[#246b59] px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-[#1d594b] cursor-pointer"
            >
              {authenticated ? "Workspace" : "Sign In / Chat"} <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Popover Mega-Menu Panel */}
        {isOpen && (
          <div className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-6xl max-h-[82vh] overflow-y-auto rounded-3xl border border-[#163e35]/15 bg-white p-0 shadow-2xl backdrop-blur-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8 dark:divide-neutral-900">
              {/* Column 1: Compute Engine */}
              <div className="flex flex-col pb-6 lg:pb-0 lg:pr-6 border-b border-[#163e35]/10 lg:border-b-0">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#dceae1] text-[#173f36]">
                  <Cpu className="h-5 w-5 text-[#173f36]" />
                </div>
                <h4 className="mb-1 text-sm font-semibold text-[#143f36] dark:text-neutral-50">
                  HalluciGuard Compute Engine
                </h4>
                <p className="mb-4 text-xs leading-relaxed text-[#62716c] dark:text-neutral-400">
                  Deconstruct AI answers into testable claims, search primary sources, and verify with multi-agent consensus.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="#investigation"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#163e35]/15 bg-[#f5f9f6] px-3 text-[11px] font-medium text-[#173f36] hover:bg-[#dceae1] transition no-underline"
                  >
                    <Layers className="h-3.5 w-3.5 text-[#246b59]" />
                    Pipelines
                  </a>
                  <a
                    href="#evidence"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#163e35]/15 bg-[#f5f9f6] px-3 text-[11px] font-medium text-[#173f36] hover:bg-[#dceae1] transition no-underline"
                  >
                    <GitBranch className="h-3.5 w-3.5 text-[#246b59]" />
                    Evidence Maps
                  </a>
                  <a
                    href="#agents"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#163e35]/15 bg-[#f5f9f6] px-3 text-[11px] font-medium text-[#173f36] hover:bg-[#dceae1] transition no-underline"
                  >
                    <Terminal className="h-3.5 w-3.5 text-[#246b59]" />
                    Agent CLI
                  </a>
                </div>
              </div>

              {/* Column 2: 5-Agent Specialist System */}
              <div className="flex flex-col gap-3.5 border-b border-[#163e35]/10 py-6 lg:border-b-0 lg:border-l lg:py-0 lg:pl-6">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#7a8883]">
                  5-Agent Specialist System
                </h4>
                <a
                  href="#agents"
                  onClick={() => setIsOpen(false)}
                  className="group flex flex-col no-underline"
                >
                  <span className="text-xs font-semibold text-[#143f36] group-hover:text-[#246b59] transition">
                    01 Detector Agent
                  </span>
                  <span className="text-[11px] text-[#62716c]">Atomic claim extraction dossier</span>
                </a>
                <a
                  href="#agents"
                  onClick={() => setIsOpen(false)}
                  className="group flex flex-col no-underline"
                >
                  <span className="text-xs font-semibold text-[#143f36] group-hover:text-[#246b59] transition">
                    02 Verifier Agent
                  </span>
                  <span className="text-[11px] text-[#62716c]">Evidence passage matching</span>
                </a>
                <a
                  href="#agents"
                  onClick={() => setIsOpen(false)}
                  className="group flex flex-col no-underline"
                >
                  <span className="text-xs font-semibold text-[#143f36] group-hover:text-[#246b59] transition">
                    03 Judge Agent
                  </span>
                  <span className="text-[11px] text-[#62716c]">Claim-level verdict synthesis</span>
                </a>
                <a
                  href="#agents"
                  onClick={() => setIsOpen(false)}
                  className="group flex flex-col no-underline"
                >
                  <span className="text-xs font-semibold text-[#143f36] group-hover:text-[#246b59] transition">
                    04 & 05 Corrector & Memory
                  </span>
                  <span className="text-[11px] text-[#62716c]">Response repair & provenance tracking</span>
                </a>
              </div>

              {/* Column 3: Resources & Proof */}
              <div className="flex flex-col gap-3 border-b border-[#163e35]/10 py-6 lg:border-b-0 lg:border-l lg:py-0 lg:pl-6">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#7a8883]">
                  Resources & Proof
                </h4>
                <a
                  href="#investigation"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-medium text-[#14382e] hover:text-[#246b59] transition no-underline"
                >
                  The Investigation Sequence
                </a>
                <a
                  href="#evidence"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-medium text-[#14382e] hover:text-[#246b59] transition no-underline"
                >
                  Evidence Constellation Graph
                </a>
                <a
                  href="#capabilities"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-medium text-[#14382e] hover:text-[#246b59] transition no-underline"
                >
                  Capabilities & Benchmarks
                </a>
                <a
                  href="#faq"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-medium text-[#14382e] hover:text-[#246b59] transition no-underline"
                >
                  FAQ & System Status
                </a>
              </div>

              {/* Column 4: Featured Launch Banner */}
              <div className="flex flex-col border-t border-[#163e35]/10 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#7a8883]">
                  Featured Workspace
                </h4>
                <div
                  onClick={() => {
                    setIsOpen(false)
                    onOpenAuth()
                  }}
                  className="group relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-2xl border border-[#246b59]/20 bg-[#edf5f1] p-5 transition hover:shadow-md cursor-pointer"
                >
                  <div>
                    <span className="mb-2 inline-block rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#173f36] shadow-sm">
                      AI Safety Workspace
                    </span>
                    <h5 className="mb-1 text-xs font-bold text-[#143f36]">
                      Ground your AI LLM answers in verified truth
                    </h5>
                    <p className="text-[11px] text-[#556660]">
                      Interact directly with the HalluciGuard multi-agent pipeline.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center text-xs font-bold text-[#246b59]">
                    Launch Chat Workspace{" "}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Action Footer inside Popover */}
            <div className="border-t border-[#163e35]/10 px-6 py-4 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  onOpenAuth()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#246b59] py-3 text-xs font-semibold text-white shadow-md hover:bg-[#1d594b] cursor-pointer"
              >
                {authenticated ? "Open Chat Workspace" : "Sign In / Launch Chat"} <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function RotatingWheel() {
  const ticks = Array.from({ length: 120 }, (_, i) => i)
  return (
    <div className="wheel-container" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" className="rotating-wheel-svg">
        <defs>
          <radialGradient id="wheelGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="50%" stopColor="rgba(215, 238, 228, 0.45)" />
            <stop offset="85%" stopColor="rgba(195, 226, 212, 0.25)" />
            <stop offset="100%" stopColor="rgba(180, 218, 202, 0)" />
          </radialGradient>
        </defs>
        <circle cx="500" cy="500" r="460" fill="url(#wheelGrad)" />
        <circle cx="500" cy="500" r="475" stroke="rgba(41, 109, 91, 0.14)" strokeWidth="1.5" fill="none" />
        <circle cx="500" cy="500" r="435" stroke="rgba(41, 109, 91, 0.16)" strokeWidth="1.5" fill="none" />
        <circle cx="500" cy="500" r="395" stroke="rgba(41, 109, 91, 0.1)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
        <circle cx="500" cy="500" r="350" stroke="rgba(41, 109, 91, 0.08)" strokeWidth="1" fill="none" />
        <g className="wheel-ticks-group">
          {ticks.map((i) => {
            const angle = (i * 360) / 120
            const isMajor = i % 5 === 0
            const tickLen = isMajor ? 28 : 16
            const r1 = 475
            const r2 = 475 - tickLen
            const rad = (angle * Math.PI) / 180
            const x1 = 500 + r1 * Math.cos(rad)
            const y1 = 500 + r1 * Math.sin(rad)
            const x2 = 500 + r2 * Math.cos(rad)
            const y2 = 500 + r2 * Math.sin(rad)
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? "rgba(41, 109, 91, 0.35)" : "rgba(41, 109, 91, 0.18)"}
                strokeWidth={isMajor ? 1.5 : 1}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}

function InvestigationVisual() {
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const hero = root.current?.closest('.hero')
    if (!hero) return undefined
    const ctx = gsap.context(() => {
      gsap.to('.rotating-wheel-svg', { rotate: 38, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.3 } })
      gsap.to('.investigation-card', { yPercent: -8, rotate: -1.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.1 } })
    }, root)
    return () => { ctx.revert(); }
  }, [])
  return (
    <div className="hero-visual-wrapper" ref={root}>
      <RotatingWheel />
      <div className="investigation-card" aria-label="Example claim investigation">
        <div className="visual-toolbar">
          <span className="toolbar-title"><ScanSearch size={15} /> INVESTIGATION 001</span>
          <span className="pause-mark">00</span>
        </div>
        <div className="examination-section">
          <span className="strip-label">AN AI ANSWER, UNDER EXAMINATION</span>
          <p className="examination-quote">
            &ldquo;Apollo 11 landed in <u className="quote-underline">1969.</u><br />
            <mark className="quote-highlight">Buzz Aldrin stepped out first.&rdquo;</mark>
          </p>
        </div>
        <div className="card-divider" />
        <div className="status-row">
          <span className="status-text">Comparing independent evidence</span>
          <span className="status-step">03 / 04</span>
        </div>
        <div className="trace-route">
          <span>Answer</span>
          <span className="route-arrow">→</span>
          <span>Claims</span>
          <span className="route-arrow">→</span>
          <span>Evidence</span>
          <span className="route-arrow">→</span>
          <span>Verdict</span>
        </div>
      </div>
      <p className="demo-note">Animated demonstration · not a live fact-check</p>
    </div>
  )
}

function Hero({ onOpenAuth, authenticated }: { onOpenAuth: () => void; authenticated: boolean }) {
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <h1 className="hero-heading">
          <SplitReveal>Don&apos;t trust</SplitReveal><br />
          <SplitReveal>the answer.</SplitReveal><br />
          <SplitReveal className="hero-serif-italic">Trace the evidence.</SplitReveal>
        </h1>
        <p className="hero-intro">
          An answer can sound right. Let&apos;s find out if it is.<br />
          Follow every claim from first question to final verdict.
        </p>
        <div className="hero-actions">
          <button className="button primary-green cursor-pointer border-0" type="button" onClick={onOpenAuth}>
            {authenticated ? 'Open Chat Workspace' : 'Launch Chat Workspace'} <ArrowRight size={16} />
          </button>
          <a className="button light-pill" href="#investigation">
            Follow an Investigation <span className="play-triangle">▶</span>
          </a>
        </div>
      </div>
      <div className="hero-stage">
        <InvestigationVisual />
      </div>
      <div className="hero-footer-left">
        Evidence grounded AI verification
      </div>
      <div className="hero-footer-right">
        Scroll to Discover ↓
      </div>
    </section>
  )
}

function InvestigationSequence() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const acts: [string, string, string][] = [
    ['Answer', 'Start with the exact response.', 'The system preserves the original language before analysis begins.'],
    ['Claims', 'Separate what can be checked.', 'One fluent paragraph becomes atomic statements with their context intact.'],
    ['Evidence', 'Bring the record to the claim.', 'Relevant passages arrive with source quality and relationship clearly marked.'],
    ['Verdict', 'Let the evidence have a say.', 'Supported facts survive. Contradictions are corrected. Uncertainty remains visible.'],
  ]
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      ScrollTrigger.create({ trigger: sectionRef.current, start: 'top top', end: '+=320%', pin: '.sequence-pin', anticipatePin: 1, onUpdate: (self) => setActive(Math.min(3, Math.floor(self.progress * 4))) })
    })
    return () => { mm.revert(); }
  }, [])
  return (
    <section className="sequence-section" id="investigation" ref={sectionRef}>
      <div className="sequence-pin">
        <div className="sequence-heading"><SplitReveal as="h2">A confident answer is only the beginning.</SplitReveal><p>Scroll to open the response and follow what survives.</p></div>
        <div className="sequence-layout">
          <div className="sequence-nav">{acts.map((act, index) => <button key={act[0]} className={active === index ? 'active' : ''} onClick={() => setActive(index)}><span>0{index + 1}</span><b>{act[0]}</b><i /></button>)}</div>
          <div className={`sequence-dossier stage-${active}`}>
            <div className="dossier-top"><span>HG / CASE 001</span><span>{String(active + 1).padStart(2, '0')} — 04</span></div>
            <div className="dossier-scene answer-scene"><span>ORIGINAL RESPONSE</span><blockquote>&ldquo;Apollo 11 landed in 1969. Buzz Aldrin was the first person to step onto the lunar surface.&rdquo;</blockquote></div>
            <div className="dossier-scene claims-scene"><span>CLAIM EXTRACTION</span><div className="claim-chip"><b>C—01</b>Apollo 11 landed in 1969.</div><div className="claim-chip flagged"><b>C—02</b>Buzz Aldrin stepped out first.</div></div>
            <div className="dossier-scene evidence-scene"><span>PRIMARY RECORD / NASA</span><div className="evidence-paper"><FileText size={20} /><p>Neil Armstrong was the first person to step onto the Moon, followed by Buzz Aldrin.</p><small>DIRECT CONTRADICTION · PRIMARY SOURCE</small></div></div>
            <div className="dossier-scene verdict-scene"><span>VERDICT ISSUED</span><div className="verdict-seal"><CheckCircle2 size={30} /><b>CORRECTED</b></div><p>Apollo 11 landed in 1969. <strong>Neil Armstrong</strong> was the first person to step onto the lunar surface.</p></div>
          </div>
          <div className="sequence-copy" key={acts[active][0]}><span>{acts[active][0]}</span><h3>{acts[active][1]}</h3><p>{acts[active][2]}</p><div className="sequence-progress"><i style={{ width: `${(active + 1) * 25}%` }} /></div></div>
        </div>
      </div>
    </section>
  )
}

function AgentSystem() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const current = agents[active]
  const ActiveIcon = current.icon
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      ScrollTrigger.create({ trigger: sectionRef.current, start: 'top top', end: '+=400%', pin: '.agent-pin', anticipatePin: 1, onUpdate: (self) => setActive(Math.min(4, Math.floor(self.progress * 5))) })
    })
    return () => { mm.revert(); }
  }, [])
  return (
    <section className="agents-section-v2" id="agents" ref={sectionRef}><div className="agent-pin">
      <div className="agent-section-head"><SplitReveal as="h2">Five specialists. One continuous evidence trail.</SplitReveal><p>Each scroll step hands the same claim to a new kind of intelligence.</p></div>
      <div className="agent-stage">
        <div className="agent-wheel">{agents.map((agent, index) => { const distance = index - active; const depth = Math.abs(distance); return <button key={agent.name} className={distance === 0 ? 'active' : ''} style={{ transform: `translate(${-depth * depth * 18}px, calc(-50% + ${distance * 92}px)) rotate(${-distance * 2.8}deg) scale(${1 - depth * .08})`, opacity: Math.max(.12, 1 - depth * .22) }} onClick={() => setActive(index)}><span>{agent.number}</span>{agent.name}</button> })}<div className="agent-wheel-focus" /></div>
        <div className="agent-core" key={current.name}><div className="agent-core-meta"><span>{current.number} / 05</span><span>ACTIVE SPECIALIST</span></div><div className="agent-icon"><ActiveIcon size={30} /></div><FoldText text={current.name} /><p>{current.action}</p><div className="agent-handoff"><span>OUTPUT</span><b>{current.output}</b><ArrowRight size={17} /></div></div>
        <div className="agent-route" aria-hidden="true"><span>CLAIM</span>{agents.map((agent, index) => <i key={agent.name} className={index <= active ? 'passed' : ''} />)}<span>MEMORY</span></div>
      </div>
    </div></section>
  )
}

function EvidenceFormats() {
  const motionRows = [formats, [...formats.slice(3), ...formats.slice(0, 3)]]

  return (
    <section className="formats-section-v2" id="evidence">
      <div className="section-shell">
        <div className="research-showcase">
          <div className="research-copy-panel">
            <div>
              <p className="mini-label"><i /> ANY EVIDENCE SHAPE</p>
              <h2>Research</h2>
              <p>Evidence that moves with the claim. Every output stays readable: what was claimed, which passage was found, and what the evidence establishes.</p>
            </div>
            <a className="research-cta" href="#relationships">Explore the records <ArrowUpRight size={17} /></a>
          </div>
          <div className="research-motion-window" aria-label="HalluciGuard evidence records">
            <div className="research-glow research-glow-one" />
            <div className="research-glow research-glow-two" />
            {motionRows.map((row, rowIndex) => (
              <div className={`research-marquee-row ${rowIndex === 1 ? 'reverse' : ''}`} key={`research-row-${rowIndex}`}>
                <div className="research-marquee-track">
                  {[0, 1].map((copyIndex) => (
                    <div className="research-card-set" aria-hidden={copyIndex === 1} key={`research-set-${rowIndex}-${copyIndex}`}>
                      {row.map((item, index) => (
                        <article className={`research-record-card ${item.tone}`} key={`${item.code}-${copyIndex}-${index}`}>
                          <div className="research-record-top"><span>{item.code}</span><FileText size={21} /></div>
                          <h3>{item.title}</h3>
                          <p>{item.copy}</p>
                          <div className="research-record-foot"><span>{String(index + 1).padStart(2, '0')} / 06</span><ArrowUpRight size={16} /></div>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="research-window-caption"><span>LIVE EVIDENCE DESK</span><span>CLAIM → SOURCE → VERDICT</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Capabilities() {
  const capabilityRows = Array.from({ length: 4 }, (_, index) => capabilities.slice(index * 3, index * 3 + 3))

  return (
    <section className="capabilities-section-v2">
      <div className="capability-title-wrap">
        <h2>Everything the agents can do.</h2>
        <p>Twelve coordinated capabilities, continuously moving through one evidence system.</p>
      </div>
      <div className="capability-flow" aria-label="HalluciGuard capabilities">
        {capabilityRows.map((row, rowIndex) => (
          <div className={`capability-marquee-row row-${rowIndex + 1} ${rowIndex % 2 ? 'reverse' : ''}`} key={`capability-row-${rowIndex}`}>
            <div className="capability-marquee-track">
              {[0, 1, 2].map((copyIndex) => (
                <div className="capability-pill-set" aria-hidden={copyIndex > 0} key={`capability-set-${rowIndex}-${copyIndex}`}>
                  {row.map(([title, Icon, tone, copy]: any, index: number) => (
                    <article className={`capability-pill ${tone}`} key={`${title}-${copyIndex}`}>
                      <div className="capability-icon-v2"><Icon size={22} /></div>
                      <div><h3>{title}</h3><p>{copy}</p></div>
                      <span>{String(rowIndex * 3 + index + 1).padStart(2, '0')}</span>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function EvidenceConstellation() {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top 68%', once: true } })
      tl.from('.constellation-claim', { scale: .7, opacity: 0, duration: .7, ease: 'back.out(1.5)' }).from('.source-node', { opacity: 0, scale: .82, y: 24, stagger: .16, duration: .65, ease: 'power3.out' }, '-=.25').from('.constellation-lines path', { strokeDashoffset: 1, duration: .8, stagger: .1, ease: 'power2.inOut' }, '-=.45').from('.constellation-verdict', { opacity: 0, y: 20, duration: .65, ease: 'power3.out' }, '-=.2')
    }, ref)
    return () => { ctx.revert(); }
  }, [])
  return (
    <section className="constellation-section" id="relationships" ref={ref}><div className="section-shell constellation-shell">
      <div className="constellation-copy" data-reveal><SplitReveal as="h2">A citation is a link. The relationship is the proof.</SplitReveal><p>HalluciGuard does not count links. It asks what each passage actually establishes, then keeps disagreement visible.</p><div className="relationship-key"><span><i className="support" />Support</span><span><i className="contradict" />Contradiction</span><span><i className="context" />Context only</span></div></div>
      <div className="constellation-board"><svg className="constellation-lines" viewBox="0 0 800 610" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M168 126 C276 158 286 248 392 298" /><path pathLength="1" d="M648 118 C548 170 522 234 407 297" /><path pathLength="1" d="M650 468 C540 420 518 360 408 316" /></svg><article className="source-node source-one"><span>S—01 / SUPPORT</span><b>NASA Mission Overview</b><p>Apollo 11 landed in July 1969.</p></article><article className="source-node source-two"><span>S—02 / CONTRADICTION</span><b>Primary mission record</b><p>Neil Armstrong stepped onto the surface first.</p></article><article className="source-node source-three"><span>S—03 / CONTEXT</span><b>Lunar module record</b><p>Buzz Aldrin followed Armstrong onto the Moon.</p></article><div className="constellation-claim"><span>CLAIM C—02</span><blockquote>&ldquo;Buzz Aldrin stepped out first.&rdquo;</blockquote></div><div className="constellation-verdict"><span>VERDICT</span><b>Contradicted</b><p>Correct the person. Preserve the mission and date.</p></div></div>
    </div></section>
  )
}

function FAQ() {
  const [open, setOpen] = useState(-1)
  const videoSrc = `/help-support.mp4`

  return (
    <section className="faq-section" id="questions">
      <div className="section-shell faq-grid-v2">
        <div className="faq-left">
          <h2>Help and <span className="support-underline">support</span></h2>
          <p className="faq-subtitle">Answers to common questions about setup, pricing, and how everything works.</p>
          <div className="faq-video-container">
            <video src={videoSrc} autoPlay loop muted playsInline preload="metadata" className="faq-video-element" />
          </div>
          <p className="still-questions-label">Still got questions?</p>
          <a className="button dark faq-contact-button" href="#contact">Contact us <ArrowRight size={15} /></a>
        </div>
        <div className="faq-right-card">
          {faqs.map((item, index) => (
            <article className={`faq-item-card ${open === index ? 'open' : ''}`} key={item.q}>
              <button
                className="faq-question-btn"
                onClick={() => setOpen(open === index ? -1 : index)}
                aria-expanded={open === index}
              >
                <span>{item.q}</span>
                <span className="plus-badge">{open === index ? '−' : '+'}</span>
              </button>
              <div className="faq-answer-collapse">
                <p>{item.a}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const [sent, setSent] = useState(false)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setSent(true)
  }
  const videoSrc = `/contact-support.mp4`

  return (
    <section className="contact-section" id="contact">
      <div className="section-shell">
        <div className="contact-header" data-reveal>
          <h2>Get in <span className="touch-underline">touch</span></h2>
          <p>Reach out to our team at any time for support or questions and we&apos;ll get back to you within 2 business days.</p>
        </div>
        <div className="contact-body">
          <aside className="contact-card-left" data-reveal>
            <div className="info-box">
              <Phone size={18} color="#444" />
              <span>412-483-8261</span>
            </div>
            <div className="info-box">
              <Mail size={18} color="#444" />
              <span>support@zovasaas.com</span>
            </div>
            <div className="info-box">
              <Building2 size={18} color="#444" />
              <span>210 Market St. Suite 402<br />San Francisco, CA</span>
            </div>
            <div className="video-box">
                  <video src={videoSrc} autoPlay loop muted playsInline preload="metadata" className="contact-video-media" />
            </div>
          </aside>
          <form className="contact-card-right" onSubmit={submit} data-reveal>
            <h3>How can we help you today?</h3>
            <div className="form-field">
              <label htmlFor="input-name">Name</label>
              <input id="input-name" name="name" required placeholder="Jane Smith" />
            </div>
            <div className="form-field">
              <label htmlFor="input-email">Email</label>
              <input id="input-email" name="email" type="email" required placeholder="jane@framer.com" />
            </div>
            <div className="form-field">
              <label htmlFor="input-topic">Topic</label>
              <select id="input-topic" name="topic" defaultValue="">
                <option value="" disabled>Select...</option>
                <option>Product demonstration</option>
                <option>Research workflow</option>
                <option>Enterprise verification</option>
                <option>Technical integration</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="input-message">Message</label>
              <textarea id="input-message" name="message" required placeholder="Enter your message" rows={4} />
            </div>
            <button className="contact-submit-button" type="submit">
              {sent ? 'Submitted' : 'Submit'}
            </button>
            {sent && <p className="sent-confirmation">Thank you! We will get back to you within 2 business days.</p>}
          </form>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer>
      <div className="footer-glow" aria-hidden="true" />
      <div className="section-shell footer-inner">
        <a className="brand footer-brand" href="#top"><BrandMark /><span>HalluciGuard</span></a>
        <h2>Don&apos;t trust the answer.<br /><em>Trace the evidence.</em></h2>
        <div className="footer-line">
          <span>Evidence-grounded claim verification</span>
          <span>Curated product preview</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const { status } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  const handleOpenAuth = useCallback(() => {
    if (status === 'authenticated') {
      router.push('/chat')
    } else {
      setAuthOpen(true)
    }
  }, [router, status])

  useSmoothScroll()
  useReveal()

  return (
    <>
      <Navbar onOpenAuth={handleOpenAuth} authenticated={status === 'authenticated'} />
      <main>
        <Hero onOpenAuth={handleOpenAuth} authenticated={status === 'authenticated'} />
        <InvestigationSequence />
        <AgentSystem />
        <EvidenceFormats />
        <Capabilities />
        <EvidenceConstellation />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}

/**
 * HalluciGuard Design Tokens & Semantic System
 * Defines the core visual language, color instrumentation, typography, and motion easing.
 */

export const HG_TOKENS = {
  colors: {
    background: {
      void: '#020408',
      obsidian: '#05080E',
      graphite: '#090E17',
      surface: '#0F1622',
      surfaceElevated: '#151F2E',
      surfaceHighlight: '#1C293D',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      medium: 'rgba(255, 255, 255, 0.12)',
      strong: 'rgba(255, 255, 255, 0.20)',
      accent: 'rgba(56, 189, 248, 0.30)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
      dim: '#475569',
      inverse: '#020408',
    },
    semantic: {
      verified: {
        base: '#10B981',
        light: '#34D399',
        glow: 'rgba(16, 185, 129, 0.25)',
        bg: 'rgba(16, 185, 129, 0.08)',
        border: 'rgba(16, 185, 129, 0.30)',
      },
      caution: {
        base: '#F59E0B',
        light: '#FBBF24',
        glow: 'rgba(245, 158, 11, 0.25)',
        bg: 'rgba(245, 158, 11, 0.08)',
        border: 'rgba(245, 158, 11, 0.30)',
      },
      contradiction: {
        base: '#EF4444',
        light: '#F87171',
        glow: 'rgba(239, 68, 68, 0.25)',
        bg: 'rgba(239, 68, 68, 0.08)',
        border: 'rgba(239, 68, 68, 0.30)',
      },
      active: {
        base: '#38BDF8',
        light: '#7DD3FC',
        glow: 'rgba(56, 189, 248, 0.25)',
        bg: 'rgba(56, 189, 248, 0.08)',
        border: 'rgba(56, 189, 248, 0.30)',
      },
      orchestration: {
        base: '#818CF8',
        light: '#A5B4FC',
        glow: 'rgba(129, 140, 248, 0.25)',
        bg: 'rgba(129, 140, 248, 0.08)',
        border: 'rgba(129, 140, 248, 0.30)',
      },
    },
  },
  typography: {
    fontSans: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: 'var(--font-geist-mono), "JetBrains Mono", "SF Mono", Consolas, monospace',
  },
  animation: {
    easeOut: [0.16, 1, 0.3, 1] as const,
    easeInOut: [0.65, 0, 0.35, 1] as const,
    springSoft: { stiffness: 260, damping: 20 },
    springHeavy: { stiffness: 400, damping: 30 },
  },
} as const;

export type SemanticStatus = 'verified' | 'caution' | 'contradiction' | 'active' | 'orchestration';

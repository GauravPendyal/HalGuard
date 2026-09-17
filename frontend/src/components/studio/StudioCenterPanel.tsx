'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { BackgroundMesh } from './BackgroundMesh';
import { PromptSuggestions } from './PromptSuggestions';
import { AnimatedAgentNetwork } from './AnimatedAgentNetwork';
import { SystemStatusBanner } from './SystemStatusBanner';

export function StudioCenterPanel() {
  return (
    <div className="relative flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden p-6 select-none">
      {/* Ambient Animated Background */}
      <BackgroundMesh />

      {/* Main Studio Content Area */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center my-auto">
        {/* Top Product Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-xs font-semibold text-blue-400 mb-4 shadow-[0_0_20px_-3px_rgba(59,130,246,0.4)]"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>HalluciGuard v2.0 Multi-Agent OS</span>
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-3xl md:text-5xl font-extrabold tracking-tight text-center text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 max-w-3xl leading-tight"
        >
          AI Verification Operating System
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-xs md:text-sm text-zinc-400 text-center max-w-2xl mt-3 leading-relaxed"
        >
          HalluciGuard continuously verifies AI generated responses using a network of intelligent agents before presenting trusted answers.
        </motion.p>

        {/* Prompt Suggestions */}
        <PromptSuggestions />

        {/* Signature Feature: Animated Agent Network */}
        <AnimatedAgentNetwork />

        {/* System Status Banner */}
        <SystemStatusBanner />
      </div>
    </div>
  );
}

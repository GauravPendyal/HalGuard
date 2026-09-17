'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Search, CheckCircle2, Database, ShieldAlert, Sparkles } from 'lucide-react';
import { AgentId } from '@/types';
import { useChatStore } from '@/store/chatStore';

interface NodeData {
  id: AgentId;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  x: number; // percentage in viewBox
  y: number; // percentage in viewBox
  glow: string;
  border: string;
  badgeColor: string;
}

export function AnimatedAgentNetwork() {
  const [hoveredNode, setHoveredNode] = React.useState<AgentId | null>(null);
  const { setSelectedAgentId } = useChatStore();

  // 6 Agents Layout Coordinates (viewBox 600 x 360)
  const nodes: NodeData[] = [
    {
      id: 'llm',
      label: 'LLM Agent',
      sublabel: 'Raw Candidate Output',
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
      x: 300,
      y: 35,
      glow: 'rgba(168,85,247,0.3)',
      border: 'border-purple-500/40',
      badgeColor: 'bg-purple-950 text-purple-400 border-purple-800',
    },
    {
      id: 'detector',
      label: 'Detector Agent',
      sublabel: 'Claim Extraction & Risk',
      icon: <Search className="w-4 h-4 text-amber-400" />,
      x: 300,
      y: 110,
      glow: 'rgba(245,158,11,0.3)',
      border: 'border-amber-500/40',
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-800',
    },
    {
      id: 'verifier',
      label: 'Verifier Agent',
      sublabel: 'Web & DOI Lookup',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      x: 160,
      y: 195,
      glow: 'rgba(34,197,94,0.3)',
      border: 'border-emerald-500/40',
      badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    },
    {
      id: 'memory',
      label: 'Memory Agent',
      sublabel: 'Vector Consensus Cache',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      x: 440,
      y: 195,
      glow: 'rgba(6,182,212,0.3)',
      border: 'border-cyan-500/40',
      badgeColor: 'bg-cyan-950 text-cyan-400 border-cyan-800',
    },
    {
      id: 'judge',
      label: 'Judge Agent',
      sublabel: 'Bayesian Truth Scoring',
      icon: <ShieldAlert className="w-4 h-4 text-blue-400" />,
      x: 300,
      y: 275,
      glow: 'rgba(59,130,246,0.3)',
      border: 'border-blue-500/40',
      badgeColor: 'bg-blue-950 text-blue-400 border-blue-800',
    },
    {
      id: 'corrector',
      label: 'Corrector Agent',
      sublabel: 'Diff Patch & Citations',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      x: 300,
      y: 335,
      glow: 'rgba(99,102,241,0.3)',
      border: 'border-indigo-500/40',
      badgeColor: 'bg-indigo-950 text-indigo-400 border-indigo-800',
    },
  ];

  // Connection Edges for DAG graph:
  const edges = [
    { from: 'llm', to: 'detector', path: 'M 300 52 L 300 93' },
    { from: 'detector', to: 'verifier', path: 'M 255 125 L 195 178' },
    { from: 'detector', to: 'memory', path: 'M 345 125 L 405 178' },
    { from: 'verifier', to: 'judge', path: 'M 195 212 L 255 260' },
    { from: 'memory', to: 'judge', path: 'M 405 212 L 345 260' },
    { from: 'judge', to: 'corrector', path: 'M 300 290 L 300 320' },
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto my-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl select-none overflow-hidden">
      {/* Network Header Badge */}
      <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-[11px] font-mono font-medium text-zinc-300 uppercase tracking-wider">
          Multi-Agent Consensus DAG (Click node to inspect agent)
        </span>
      </div>

      {/* SVG Canvas for Connecting Edges and Particles */}
      <div className="relative w-full aspect-[600/360]">
        <svg viewBox="0 0 600 360" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Connections */}
          {edges.map((edge, i) => (
            <g key={i}>
              {/* Static Background Edge Line */}
              <path
                d={edge.path}
                fill="none"
                stroke={hoveredNode === edge.from || hoveredNode === edge.to ? '#3b82f6' : '#27272a'}
                strokeWidth={hoveredNode === edge.from || hoveredNode === edge.to ? '3' : '2'}
                strokeDasharray="4 4"
              />
              {/* Animated Glowing Edge Pulse */}
              <motion.path
                d={edge.path}
                fill="none"
                stroke="url(#edgeGradient)"
                strokeWidth={hoveredNode === edge.from || hoveredNode === edge.to ? '3' : '2'}
                strokeDasharray="8 8"
                animate={{
                  strokeDashoffset: [0, -32],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{ filter: 'url(#glow)' }}
              />
            </g>
          ))}
        </svg>

        {/* Render HTML Floating Node Cards */}
        {nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          return (
            <motion.div
              key={node.id}
              style={{
                left: `${(node.x / 600) * 100}%`,
                top: `${(node.y / 360) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                y: ['-50%', '-54%', '-50%'],
              }}
              transition={{
                duration: 4 + (node.x % 3),
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => setSelectedAgentId(node.id)}
              className="absolute z-10 cursor-pointer"
            >
              <motion.div
                whileHover={{ scale: 1.08 }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900/95 border backdrop-blur-md transition-all duration-300 ${node.border}`}
                style={{
                  boxShadow: isHovered
                    ? `0 0 25px ${node.glow}`
                    : `0 0 12px ${node.glow.replace('0.3', '0.1')}`,
                }}
              >
                {/* Glowing Pulse Ring */}
                <div className="relative flex items-center justify-center p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                  {node.icon}
                  <span
                    className="absolute inset-0 rounded-lg animate-pulse"
                    style={{ backgroundColor: node.glow }}
                  />
                </div>

                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-100">{node.label}</span>
                    <span className={`text-[9px] font-mono px-1 rounded border ${node.badgeColor}`}>
                      IDLE
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">{node.sublabel}</span>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

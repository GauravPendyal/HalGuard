'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

export function BackgroundMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      {/* Soft Moving Ambient Radial Glows */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -40, 25, 0],
          y: [0, 30, -30, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 -right-20 w-[450px] h-[450px] rounded-full bg-purple-600/10 blur-[130px]"
      />
      <motion.div
        animate={{
          x: [0, 20, -30, 0],
          y: [0, 40, -20, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-30 left-1/3 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[140px]"
      />

      {/* Subtle Architectural Grid Line Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
    </div>
  );
}

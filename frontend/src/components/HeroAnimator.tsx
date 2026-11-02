'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, BookOpen, Smartphone, Laptop, Tablet, Sparkles } from 'lucide-react';

// Custom Lucide-style YouTube Icon
function Youtube({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

export default function HeroAnimator() {
  const [phase, setPhase] = useState(0);
  const [deviceIndex, setDeviceIndex] = useState(0);

  // Cycle phases 0, 1, 2 every 2.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPhase((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // In Phase 2 (Anywhere), cycle through Laptop -> Tablet -> Smartphone
  const devices = [
    { name: 'Laptop', icon: Laptop, width: 280, height: 150 },
    { name: 'Tablet', icon: Tablet, width: 200, height: 170 },
    { name: 'Smartphone', icon: Smartphone, width: 130, height: 190 },
  ];

  useEffect(() => {
    if (phase !== 2) {
      setDeviceIndex(0);
      return;
    }
    const deviceTimer = setInterval(() => {
      setDeviceIndex((prev) => (prev + 1) % 3);
    }, 800);
    return () => clearInterval(deviceTimer);
  }, [phase]);

  return (
    <div
      className="h-72 w-full max-w-2xl mx-auto relative flex items-center justify-center rounded-2xl border border-foreground/10 bg-foreground/[0.02] backdrop-blur-xs overflow-hidden select-none"
    >
      {/* Background Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }}
      />

      {/* Top Phase Status Tag */}
      <div className="absolute top-3.5 left-4 z-20 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-foreground/5 border border-foreground/10 text-foreground/70">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          {phase === 0 && 'Anything: Universal Sources'}
          {phase === 1 && 'Companion: Intelligent Synthesis'}
          {phase === 2 && 'Anywhere: Multi-Device Responsive'}
        </span>
      </div>

      {/* Main Animated Stage */}
      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">

          {/* PHASE 0: Anything - Youtube, FileText, BookOpen spread out floating inward */}
          {phase === 0 && (
            <motion.div
              key="phase-anything"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.4 }}
              className="relative w-full max-w-sm h-48 flex items-center justify-center"
            >
              {/* Youtube Icon (Left, floating inward) */}
              <motion.div
                initial={{ x: -140, y: -20, opacity: 0 }}
                animate={{
                  x: [-120, -65, -80],
                  y: [-15, 10, -5],
                  opacity: 1
                }}
                transition={{
                  duration: 2.3,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="absolute flex flex-col items-center gap-1 p-3 rounded-2xl bg-foreground/[0.04] border border-foreground/15 shadow-sm text-red-500 backdrop-blur-xs"
              >
                <Youtube className="w-7 h-7" />
                <span className="text-[9px] font-mono text-foreground/50">YouTube</span>
              </motion.div>

              {/* BookOpen Icon (Right, floating inward) */}
              <motion.div
                initial={{ x: 140, y: -20, opacity: 0 }}
                animate={{
                  x: [120, 65, 80],
                  y: [15, -10, 5],
                  opacity: 1
                }}
                transition={{
                  duration: 2.3,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="absolute flex flex-col items-center gap-1 p-3 rounded-2xl bg-foreground/[0.04] border border-foreground/15 shadow-sm text-indigo-400 backdrop-blur-xs"
              >
                <BookOpen className="w-7 h-7" />
                <span className="text-[9px] font-mono text-foreground/50">Books</span>
              </motion.div>

              {/* FileText Icon (Top/Center, floating inward) */}
              <motion.div
                initial={{ y: 70, opacity: 0 }}
                animate={{
                  y: [55, -20, 0],
                  scale: [0.95, 1.05, 1],
                  opacity: 1
                }}
                transition={{
                  duration: 2.3,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="absolute flex flex-col items-center gap-1 p-3 rounded-2xl bg-foreground/[0.04] border border-foreground/15 shadow-sm text-amber-500 backdrop-blur-xs"
              >
                <FileText className="w-7 h-7" />
                <span className="text-[9px] font-mono text-foreground/50">Articles</span>
              </motion.div>

              <div className="absolute -bottom-2 text-[10px] font-mono text-foreground/40">
                Any source floating inward into AARC
              </div>
            </motion.div>
          )}

          {/* PHASE 1: Companion - Rotating spark or AI node */}
          {phase === 1 && (
            <motion.div
              key="phase-companion"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.15, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center gap-3.5 z-10"
            >
              <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Outer rotating dashed ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border border-dashed border-indigo-500/50"
                />

                {/* Second reverse orbiting ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-2 rounded-full border border-foreground/15"
                />

                {/* Central rotating spark / AI node */}
                <motion.div
                  animate={{
                    rotate: [0, 180, 360],
                    scale: [1, 1.12, 1]
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="w-11 h-11 rounded-2xl bg-foreground/10 border border-foreground/20 flex items-center justify-center text-foreground shadow-md backdrop-blur-sm"
                >
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </motion.div>
              </div>

              <div className="text-center">
                <span className="text-sm font-serif font-bold text-foreground block">
                  Your Reading Companion
                </span>
                <span className="text-[10px] font-mono text-foreground/45">
                  AI De-cluttering & Passage Extraction
                </span>
              </div>
            </motion.div>
          )}

          {/* PHASE 2: Anywhere - Expanding clean text frame morphing Laptop -> Tablet -> Smartphone */}
          {phase === 2 && (
            <motion.div
              key="phase-anywhere"
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                width: devices[deviceIndex].width,
                height: devices[deviceIndex].height
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                layout: { type: 'spring', stiffness: 200, damping: 25 },
                width: { type: 'spring', stiffness: 200, damping: 25 },
                height: { type: 'spring', stiffness: 200, damping: 25 },
                duration: 0.4
              }}
              className="border border-foreground rounded-lg p-2 bg-background/90 shadow-md flex flex-col justify-between overflow-hidden relative z-10"
            >
              {/* Device Header Bar */}
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-foreground/10 text-foreground/60">
                <span className="text-[9px] font-mono font-medium">
                  {devices[deviceIndex].name}
                </span>
                {React.createElement(devices[deviceIndex].icon, { className: 'w-3.5 h-3.5 text-foreground' })}
              </div>

              {/* 3 horizontal bg-foreground/80 text lines inside */}
              <div className="space-y-2 py-1.5 flex-1 flex flex-col justify-center">
                {[0, 1, 2].map((lineIndex) => (
                  <motion.div
                    key={lineIndex}
                    layout
                    className="h-1.5 rounded-full bg-foreground/80"
                    style={{
                      width: lineIndex === 0 ? '100%' : lineIndex === 1 ? '82%' : '60%',
                    }}
                    transition={{ layout: { duration: 0.3 } }}
                  />
                ))}
              </div>

              {/* Minimal Device Footer Indicator */}
              <div className="flex items-center justify-between pt-1 border-t border-foreground/10 text-[8px] text-foreground/40 font-mono">
                <span>Clean Layout</span>
                <span>Anywhere</span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Device Indicator Footer */}
      <div className="absolute bottom-2.5 left-0 right-0 flex items-center justify-center gap-5 z-20">
        {devices.map((dev, idx) => {
          const Icon = dev.icon;
          const isActive = phase === 2 && deviceIndex === idx;
          return (
            <div
              key={dev.name}
              className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${isActive ? 'text-foreground font-semibold' : 'text-foreground/30'
                }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] hidden sm:inline">{dev.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

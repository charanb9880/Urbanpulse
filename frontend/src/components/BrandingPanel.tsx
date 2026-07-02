'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

const intelligenceMessages = [
  'Analyzing Traffic Patterns...',
  'Validating Citizen Reports...',
  'Coordinating Emergency Routes...',
  'Assessing Network Impact...',
  'Generating Decision Support...',
  'Monitoring Urban Mobility...',
  'Synchronizing City Intelligence...',
];

const statusItems = [
  { text: "City Status: Stable", color: "bg-emerald-500", border: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" },
  { text: "Monitoring Elevated Activity", color: "bg-amber-500", border: "border-amber-500/20 text-amber-400 bg-amber-500/5" },
  { text: "Traffic Intelligence Active", color: "bg-sky-500", border: "border-sky-500/20 text-sky-400 bg-sky-500/5" },
  { text: "Emergency Coordination Enabled", color: "bg-orange-500", border: "border-orange-500/20 text-orange-400 bg-orange-500/5" },
];

export default function BrandingPanel() {
  const [feedIndex, setFeedIndex] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  // Rotating feeds and status
  useEffect(() => {
    const feedInterval = setInterval(() => {
      setFeedIndex((prev) => (prev + 1) % intelligenceMessages.length);
    }, 3500); // 3.5s transition
    
    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusItems.length);
    }, 4000); // 4s transition

    return () => {
      clearInterval(feedInterval);
      clearInterval(statusInterval);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[380px] lg:min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between p-8 lg:p-12 text-white border-b lg:border-b-0 lg:border-r border-slate-800/40">
      
      {/* Scope-contained high-performance CSS animations */}
      <style jsx global>{`
        /* 1. Radar Sweep: Rotates in 3.5s, then pauses for 3.5s */
        @keyframes radarSweep {
          0% { transform: rotate(0deg); opacity: 0; }
          4% { opacity: 0.8; }
          46% { opacity: 0.8; }
          50% { transform: rotate(360deg); opacity: 0; }
          100% { transform: rotate(360deg); opacity: 0; }
        }
        
        /* 2. Core Breathing: 4.5 seconds */
        @keyframes coreBreath {
          0%, 100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.25));
          }
          50% { 
            transform: scale(1.04);
            filter: drop-shadow(0 0 16px rgba(99, 102, 241, 0.65));
          }
        }
        
        /* 3. Decision Pulse: Outward wave triggers after data exchange */
        @keyframes decisionPulse {
          0%, 40% { 
            transform: scale(0.9); 
            opacity: 0; 
          }
          50% { 
            opacity: 0.8; 
          }
          90% { 
            transform: scale(3.5); 
            opacity: 0; 
          }
          100% { 
            transform: scale(3.5); 
            opacity: 0; 
          }
        }

        /* 4. Node animations */
        /* Citizen (Flow Prediction): Soft expansion pulse (2.5s) */
        @keyframes flowPredictionPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(99,102,241,0.2)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 8px rgba(99,102,241,0.5)); }
        }
        
        /* Responder (Live Responders): Brief activity blink (3s) */
        @keyframes responderBlink {
          0%, 75%, 100% { opacity: 0.6; }
          80%, 90% { opacity: 1; filter: drop-shadow(0 0 8px rgba(244,63,94,0.65)); }
          85%, 95% { opacity: 0.4; }
        }
        
        /* Network (Decision Support): Gentle glow increase (3s) */
        @keyframes networkGlow {
          0%, 100% { filter: drop-shadow(0 0 1px rgba(16,185,129,0.1)); }
          50% { filter: drop-shadow(0 0 12px rgba(16,185,129,0.75)); }
        }
        
        /* Mobility (Mobility Intelligence): Breathing (4.5s) */
        @keyframes mobilityBreath {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.06); opacity: 1; }
        }

        /* Background grid fade in (System Initialization) */
        @keyframes gridFadeIn {
          from { opacity: 0; }
          to { opacity: 0.02; }
        }
        
        /* Classes */
        .grid-fade-in {
          animation: gridFadeIn 3s ease-out forwards;
        }
        
        .radar-sweep-group {
          transform-origin: 100px 100px;
          animation: radarSweep 7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .center-core-group {
          transform-origin: 100px 100px;
          animation: coreBreath 4.5s ease-in-out infinite;
        }

        .citizen-node-group {
          transform-origin: 60px 60px;
          animation: flowPredictionPulse 2.5s ease-in-out infinite;
        }
        
        .responder-node-group {
          transform-origin: 140px 60px;
          animation: responderBlink 3s ease-in-out infinite;
        }
        
        .network-node-group {
          transform-origin: 60px 140px;
          animation: networkGlow 3s ease-in-out infinite;
        }
        
        .mobility-node-group {
          transform-origin: 140px 140px;
          animation: mobilityBreath 4.5s ease-in-out infinite;
        }
      `}</style>

      {/* Dynamic Background Light Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Banner (Logo & Pulsing Live Status Capsule) */}
      <div className="relative z-10 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <motion.div 
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10"
          >
            <Zap className="w-5 h-5 text-white" />
          </motion.div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            UrbanPulse AI
          </span>
        </div>
        
        {/* LIVE CITY STATUS INDICATOR */}
        <div className="relative h-8 flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={statusIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-semibold tracking-wide backdrop-blur-md transition-all ${statusItems[statusIndex].border}`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusItems[statusIndex].color}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${statusItems[statusIndex].color}`} />
              </span>
              {statusItems[statusIndex].text}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Middle Section: Smart-City Decision Cycle SVG Illustration */}
      <div className="relative z-10 my-auto py-6 lg:py-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-[340px] aspect-square relative flex items-center justify-center">
          
          {/* Faint grid overlay */}
          <div 
            className="absolute inset-0 grid-fade-in opacity-[0.02] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none rounded-full" 
            style={{ maskImage: 'radial-gradient(circle at center, black, transparent 70%)' }}
          />

          {/* Main Visual SVG */}
          <svg viewBox="0 0 200 200" className="w-full h-full text-indigo-400/80">
            {/* Gradients and Filters Definition */}
            <defs>
              {/* Radar Wedge Gradient */}
              <linearGradient id="radarSweepWedgeGrad" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
              
              {/* Central Core Gradient */}
              <linearGradient id="centerCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>

              {/* Path gradients for particle aesthetics */}
              <linearGradient id="pathFlowGrad" x1="0%" y1="0%" x2="1" y2="1">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* RADAR SWEEP BACKGROUND SCAN LINES */}
            <circle cx="100" cy="100" r="85" stroke="rgba(255,255,255,0.03)" strokeWidth="0.75" fill="none" />
            <circle cx="100" cy="100" r="60" stroke="rgba(255,255,255,0.03)" strokeWidth="0.75" fill="none" />
            <circle cx="100" cy="100" r="35" stroke="rgba(255,255,255,0.03)" strokeWidth="0.75" fill="none" />
            <line x1="100" y1="15" x2="100" y2="185" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" strokeDasharray="3,3" />
            <line x1="15" y1="100" x2="185" y2="100" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" strokeDasharray="3,3" />

            {/* RADAR SWEEP SCANNER (Observation scan sweep - Periodic 3.5s scan, 3.5s pause) */}
            <g className="radar-sweep-group">
              {/* Rotating radar trail sweep wedge (30-degree pie segment) */}
              <path d="M 100,100 L 100,15 A 85,85 0 0,1 142.5,26.4 Z" fill="url(#radarSweepWedgeGrad)" />
              {/* Leading sweep line */}
              <line x1="100" y1="100" x2="100" y2="15" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="1" />
            </g>

            {/* INFORMATION EXCHANGE PATHWAYS */}
            {/* Faint guide lines */}
            <line x1="60" y1="60" x2="100" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="2,4" />
            <line x1="60" y1="140" x2="100" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="2,4" />
            <line x1="100" y1="100" x2="140" y2="60" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="2,4" />
            <line x1="100" y1="100" x2="140" y2="140" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="2,4" />

            {/* DATA TRANSFER FLOW PARTICLES (animateMotion along coordinate paths) */}
            {/* 1. Flow Prediction -> Core (Observe: Inward) */}
            <circle r="1.5" fill="#6366f1">
              <animateMotion dur="1.6s" repeatCount="indefinite" path="M 60,60 L 100,100" keyTimes="0;1" keySplines="0.4 0 0.2 1" calcMode="spline" />
            </circle>

            {/* 2. Decision Support -> Core (Predict: Inward) */}
            <circle r="1.5" fill="#10b981">
              <animateMotion dur="2s" repeatCount="indefinite" path="M 60,140 L 100,100" keyTimes="0;1" keySplines="0.4 0 0.2 1" calcMode="spline" />
            </circle>

            {/* 3. Core -> Live Responders (Coordinate: Outward) */}
            <circle r="1.5" fill="#f43f5e">
              <animateMotion dur="1.8s" repeatCount="indefinite" path="M 100,100 L 140,60" keyTimes="0;1" keySplines="0.4 0 0.2 1" calcMode="spline" />
            </circle>

            {/* 4. Core -> Mobility Intelligence (Respond: Outward) */}
            <circle r="1.5" fill="#a855f7">
              <animateMotion dur="2.2s" repeatCount="indefinite" path="M 100,100 L 140,140" keyTimes="0;1" keySplines="0.4 0 0.2 1" calcMode="spline" />
            </circle>

            {/* DECISION GENERATION PULSE (Outward circular waves triggered after flows) */}
            <circle cx="100" cy="100" r="16" fill="none" stroke="#a855f7" strokeWidth="0.75" className="origin-[100px_100px] animate-[decisionPulse_6s_cubic-bezier(0.16,1,0.3,1)_infinite]" />
            <circle cx="100" cy="100" r="16" fill="none" stroke="#6366f1" strokeWidth="0.5" className="origin-[100px_100px] animate-[decisionPulse_6s_cubic-bezier(0.16,1,0.3,1)_infinite_3s]" />

            {/* CENTRAL AI CORE */}
            <g className="center-core-group">
              <circle cx="100" cy="100" r="16" fill="url(#centerCoreGrad)" />
              <circle cx="100" cy="100" r="11.5" fill="#090d16" />
              <circle cx="100" cy="100" r="3.5" fill="#ffffff" className="animate-pulse" />
            </g>
            <text x="100" y="123" textAnchor="middle" fontSize="6.5" fontWeight="bold" letterSpacing="0.08em" fill="#e2e8f0" opacity="0.8">CORE AI</text>

            {/* CYCLE FUNCTIONAL NODES */}

            {/* 1. FLOW PREDICTION (Citizen Node at 60,60: Soft expansion pulse) */}
            <g>
              <circle cx="60" cy="60" r="14" fill="none" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="0.5" />
              <g className="citizen-node-group">
                <circle cx="60" cy="60" r="10" fill="#090d16" stroke="#6366f1" strokeWidth="1.2" />
                {/* Visual citizen bust representation */}
                <path d="M56.5,63 C56.5,61.2 58,60.2 60,60.2 C62,60.2 63.5,61.2 63.5,63" fill="none" stroke="#e2e8f0" strokeWidth="0.85" />
                <circle cx="60" cy="57.5" r="1.8" fill="#e2e8f0" />
              </g>
              <text x="60" y="42" textAnchor="middle" fontSize="6.5" fontWeight="bold" letterSpacing="0.08em" fill="#94a3b8">FLOW PREDICTION</text>
            </g>

            {/* 2. DECISION SUPPORT (Network Node at 60,140: Gentle glow increase) */}
            <g>
              <circle cx="60" cy="140" r="14" fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="0.5" />
              <g className="network-node-group">
                <circle cx="60" cy="140" r="10" fill="#090d16" stroke="#10b981" strokeWidth="1.2" />
                {/* Connected network node lines */}
                <circle cx="58" cy="138" r="1" fill="#e2e8f0" />
                <circle cx="62" cy="142" r="1" fill="#e2e8f0" />
                <circle cx="62" cy="138" r="1" fill="#e2e8f0" />
                <line x1="58" y1="138" x2="62" y2="142" stroke="#e2e8f0" strokeWidth="0.75" />
                <line x1="58" y1="138" x2="62" y2="138" stroke="#e2e8f0" strokeWidth="0.75" />
              </g>
              <text x="60" y="159" textAnchor="middle" fontSize="6.5" fontWeight="bold" letterSpacing="0.08em" fill="#94a3b8">DECISION SUPPORT</text>
            </g>

            {/* 3. LIVE RESPONDERS (Responder Node at 140,60: Activity double-blink) */}
            <g>
              <circle cx="140" cy="60" r="14" fill="none" stroke="rgba(244, 63, 94, 0.15)" strokeWidth="0.5" />
              <g className="responder-node-group">
                <circle cx="140" cy="60" r="10" fill="#090d16" stroke="#f43f5e" strokeWidth="1.2" />
                {/* Shield badge representation */}
                <path d="M137.5,57.5 L140,56 L142.5,57.5 V61 C142.5,62.5 140,64 140,64 C140,64 137.5,62.5 137.5,61 Z" fill="none" stroke="#e2e8f0" strokeWidth="0.85" />
              </g>
              <text x="140" y="42" textAnchor="middle" fontSize="6.5" fontWeight="bold" letterSpacing="0.08em" fill="#94a3b8">LIVE RESPONDERS</text>
            </g>

            {/* 4. MOBILITY INTELLIGENCE (Mobility Node at 140,140: Breathing animation) */}
            <g>
              <circle cx="140" cy="140" r="14" fill="none" stroke="rgba(168, 85, 247, 0.15)" strokeWidth="0.5" />
              <g className="mobility-node-group">
                <circle cx="140" cy="140" r="10" fill="#090d16" stroke="#a855f7" strokeWidth="1.2" />
                {/* Connected network routing guide lines */}
                <line x1="136.5" y1="136.5" x2="143.5" y2="143.5" stroke="#e2e8f0" strokeWidth="0.85" />
                <line x1="136.5" y1="143.5" x2="143.5" y2="136.5" stroke="#e2e8f0" strokeWidth="0.85" />
              </g>
              <text x="140" y="159" textAnchor="middle" fontSize="6.5" fontWeight="bold" letterSpacing="0.08em" fill="#94a3b8">MOBILITY INTELLIGENCE</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Bottom Section: Rotating Operational Intelligence Feed */}
      <div className="relative z-10 mt-auto pt-8 border-t border-slate-800/40 space-y-4">
        
        {/* DYNAMIC FEED CAPSLULE CONTAINER */}
        <div className="h-9 bg-slate-950/40 border border-slate-800/60 rounded-xl px-4 flex items-center justify-center overflow-hidden relative shadow-inner">
          <AnimatePresence mode="wait">
            <motion.p
              key={feedIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="text-[12px] font-semibold tracking-wider text-slate-400 uppercase text-center w-full"
            >
              {intelligenceMessages[feedIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="text-slate-400 text-sm lg:text-base leading-relaxed font-light">
          Empowering cities through intelligent traffic insights, citizen participation, and proactive decision support.
        </div>
        
        <div className="mt-8 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>v2.4.0 (AI Core)</span>
          <span>© UrbanPulse AI</span>
        </div>
      </div>
    </div>
  );
}
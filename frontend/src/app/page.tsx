'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import Link from 'next/link';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 px-8 py-6 transition-all duration-300 ${scrolled
          ? 'bg-black/40 backdrop-blur-2xl border-b border-white/10'
          : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tight text-white">
          UrbanPulse AI
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {['Technology', 'Intelligence', 'Simulation', 'Command Center', 'About'].map((item) => (
            <a
              key={item}
              href="#"
              className="text-white/80 hover:text-white transition-colors text-sm font-medium"
            >
              {item}
            </a>
          ))}
          <Link
            href="/auth"
            className="px-6 py-2 rounded-full border border-white/30 text-white hover:bg-white hover:text-black transition-all"
          >
            Login
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

const Hero = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      <video
        src="/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-transparent" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight text-white mb-6"
        >
          UrbanPulse AI
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-2xl md:text-4xl text-blue-300 mb-4 font-light tracking-widest"
        >
          Predict Before It Happens
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="text-lg md:text-xl text-white/70 max-w-3xl mb-12"
        >
          An AI-powered urban intelligence platform that predicts congestion, understands impact, and helps cities respond before disruptions escalate.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-6"
        >
          <Link href="/auth">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white rounded-full font-semibold text-lg shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all"
            >
              Launch Command Center
            </motion.button>
          </Link>
          <button className="px-10 py-4 border border-white/30 text-white rounded-full font-semibold text-lg hover:bg-white/10 transition-all">
            Explore Technology
          </button>
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <motion.div
            animate={{ y: [5, 15, 5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 bg-white rounded-full mt-2"
          />
        </div>
      </motion.div>
    </section>
  );
};

const ProblemSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const steps = [
    { text: 'Accident', delay: 0 },
    { text: 'Congestion', delay: 0.3 },
    { text: 'Delay', delay: 0.6 },
    { text: 'Emergency Impact', delay: 0.9 },
  ];

  return (
    <section ref={ref} className="min-h-screen bg-black py-32 px-6 flex items-center justify-center">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold text-white mb-24"
        >
          A single disruption can affect thousands.
        </motion.h2>
        <div className="flex flex-col items-center gap-8">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center">
              <motion.p
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: step.delay }}
                className="text-3xl md:text-5xl font-bold text-white"
              >
                {step.text}
              </motion.p>
              {i < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={isInView ? { opacity: 1, scaleY: 1 } : {}}
                  transition={{ duration: 0.6, delay: step.delay + 0.2 }}
                  className="text-blue-400 text-4xl my-4"
                >
                  ↓
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowUrbanPulseThinks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const inputs = ['Weather', 'Road Network', 'Traffic', 'Incidents', 'Historical Patterns'];
  const outputs = ['Predictions', 'Recommendations'];

  return (
    <section ref={ref} className="min-h-screen bg-gradient-to-b from-black to-slate-950 py-32 px-6 flex items-center justify-center">
      <div className="max-w-6xl mx-auto w-full">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold text-white text-center mb-24"
        >
          How UrbanPulse Thinks
        </motion.h2>

        <div className="flex flex-col items-center gap-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {inputs.map((input, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-center font-medium"
              >
                {input}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="px-12 py-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-3xl text-2xl md:text-3xl font-bold text-blue-300"
          >
            Graph Neural Network
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outputs.map((output, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 1 + i * 0.1 }}
                className="px-8 py-5 bg-white/10 border border-white/20 rounded-2xl text-white text-center font-semibold text-xl"
              >
                {output}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const BengaluruNeuralNetwork = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodes = [
    { name: 'Whitefield', x: 20, y: 30 },
    { name: 'Hebbal', x: 50, y: 20 },
    { name: 'Silk Board', x: 50, y: 70 },
    { name: 'KR Puram', x: 80, y: 30 },
    { name: 'Electronic City', x: 30, y: 80 },
  ];

  const connections = [
    ['Whitefield', 'Hebbal'],
    ['Whitefield', 'KR Puram'],
    ['Hebbal', 'Silk Board'],
    ['Silk Board', 'Electronic City'],
    ['KR Puram', 'Silk Board'],
  ];

  return (
    <section ref={ref} className="min-h-screen bg-slate-950 py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold text-white text-center mb-16"
        >
          The Bengaluru Neural Network
        </motion.h2>

        <div className="relative h-[600px] bg-black/50 rounded-3xl border border-white/10 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full">
            {connections.map(([from, to], i) => {
              const fromNode = nodes.find(n => n.name === from)!;
              const toNode = nodes.find(n => n.name === to)!;
              return (
                <motion.line
                  key={i}
                  x1={`${fromNode.x}%`}
                  y1={`${fromNode.y}%`}
                  x2={`${toNode.x}%`}
                  y2={`${toNode.y}%`}
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 1, delay: i * 0.2 }}
                />
              );
            })}
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

          {nodes.map((node, i) => (
            <motion.div
              key={node.name}
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onMouseEnter={() => setHoveredNode(node.name)}
              onMouseLeave={() => setHoveredNode(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            >
              <div className="relative">
                <motion.div
                  animate={hoveredNode === node.name ? { scale: 1.3 } : { scale: 1 }}
                  className="absolute inset-0 w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20"
                  style={{
                    boxShadow: hoveredNode === node.name
                      ? '0 0 60px 20px rgba(59, 130, 246, 0.4)'
                      : '0 0 30px 10px rgba(59, 130, 246, 0.2)'
                  }}
                />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg relative z-10">
                  {node.name.charAt(0)}
                </div>
                <p className="text-white text-center mt-4 font-medium">{node.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ComparisonSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const traditionalFeatures = ['Current Traffic', 'Current Delay', 'Reactive Information'];
  const urbanPulseFeatures = ['Future Congestion', 'Accessibility Impact', 'Emergency Impact', 'AI Recommendations', 'Predictive Intelligence'];

  return (
    <section ref={ref} className="min-h-screen bg-gradient-to-b from-slate-950 to-black py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold text-white text-center mb-20"
        >
          Why UrbanPulse
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-10"
          >
            <h3 className="text-3xl font-bold text-white/70 mb-8">Traditional Systems</h3>
            <ul className="space-y-4">
              {traditionalFeatures.map((feature, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                  className="text-xl text-white/60 flex items-center gap-4"
                >
                  <span className="w-3 h-3 rounded-full bg-white/20" />
                  {feature}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-3xl p-10"
          >
            <h3 className="text-3xl font-bold text-blue-300 mb-8">UrbanPulse AI</h3>
            <ul className="space-y-4">
              {urbanPulseFeatures.map((feature, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                  className="text-xl text-white flex items-center gap-4"
                >
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  {feature}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const AIBrain = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="min-h-screen bg-black py-32 px-6 flex items-center justify-center">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold text-white mb-20"
        >
          The AI Brain
        </motion.h2>

        <div className="relative w-80 h-80 mx-auto">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? {
                opacity: [0.6, 0.3, 0.6],
                scale: [1, 1.2, 1],
              } : {}}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
              }}
              style={{
                background: i === 0
                  ? 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)'
                  : i === 1
                    ? 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)',
              }}
              className="absolute inset-0 rounded-full"
            />
          ))}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1 }}
            className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl"
            style={{
              boxShadow: '0 0 100px 30px rgba(59, 130, 246, 0.5)'
            }}
          >
            <div className="text-white text-4xl font-black">UP</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-20">
          {['Weather', 'Road Network', 'Traffic', 'Incidents', 'Historical Data'].map((input, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 1 + i * 0.1 }}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
            >
              {input}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FinalCTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="min-h-screen bg-gradient-to-b from-black to-slate-950 py-32 px-6 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center">
        <div className="relative w-48 h-48 mx-auto mb-16">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.6, 0.3, 0.6],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30"
            />
          ))}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center" style={{ boxShadow: '0 0 80px 20px rgba(59, 130, 246, 0.5)' }}>
            <div className="text-white text-2xl font-black">UP</div>
          </div>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-black text-white mb-6"
        >
          The Living Pulse of Bengaluru
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-2xl text-white/70 mb-12"
        >
          Understand the city before the city reacts.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-6 justify-center"
        >
          <Link href="/auth">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white rounded-full font-semibold text-xl shadow-2xl shadow-blue-500/40"
            >
              Launch Platform
            </motion.button>
          </Link>
          <button className="px-12 py-5 border border-white/30 text-white rounded-full font-semibold text-xl hover:bg-white/10 transition-all">
            Explore Urban Intelligence
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default function Home() {
  return (
    <div className="bg-black text-white overflow-hidden">
      <Navbar />
      <Hero />
      <ProblemSection />
      <HowUrbanPulseThinks />
      <BengaluruNeuralNetwork />
      <ComparisonSection />
      <AIBrain />
      <FinalCTA />
    </div>
  );
}

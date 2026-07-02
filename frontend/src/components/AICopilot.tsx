'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, BrainCircuit, Bot } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export default function AICopilot() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello! I am your UrbanPulse AI Copilot. How can I assist you with city intelligence today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Only show if user is authenticated and not on auth or authority pages
  if (!user || pathname?.startsWith('/auth') || pathname?.startsWith('/signup') || pathname?.startsWith('/login') || pathname?.startsWith('/authority')) {
    return null;
  }
  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    
    let context: any = {};
    try {
      const stored = localStorage.getItem('urbanpulse_route_context');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
          context = { ...context, ...parsed };
        }
      }
      const verifStored = localStorage.getItem('urbanpulse_verification_context');
      if (verifStored) {
        const parsed = JSON.parse(verifStored);
        if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
          context.verification = parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await api.chat(msg, context);
      setMessages(prev => [...prev, { role: 'ai', text: res.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I am currently unable to connect to the intelligence network.' }]);
    } finally {
      setLoading(false);
    }
  };  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl shadow-blue-500/30 bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center transition-all ${isOpen ? 'hidden' : 'flex'}`}
      >
        <div className="relative flex items-center justify-center">
          <Bot className="w-7 h-7 relative z-10" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-white/20 rounded-full blur-sm"
          />
        </div>
      </motion.button>

      {/* Slide-in Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] max-h-[85vh] bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl shadow-blue-900/20 rounded-3xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <Sparkles className="w-5 h-5 text-blue-50" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">AI Copilot</h3>
                  <p className="text-[11px] text-blue-100 font-medium">UrbanPulse Intelligence</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      m.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-white border border-slate-200/60 text-slate-700 rounded-tl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] p-4 rounded-2xl bg-white border border-slate-200/60 rounded-tl-sm flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-blue-500 animate-pulse" />
                    <span className="text-xs text-slate-400 font-medium animate-pulse">Analyzing urban data...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative flex items-center">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about traffic, weather, incidents..."
                  className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="absolute right-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                AI Copilot can make mistakes. Verify critical alerts.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

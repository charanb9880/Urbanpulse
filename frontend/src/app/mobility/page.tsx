'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ArrowLeft, AlertTriangle, TrendingUp, Clock, MapPin, Users,
  Brain, Compass, RefreshCw, Radar, Zap, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function MobilityPulseDashboard() {
  return (
    <ProtectedRoute allowedRoles={['authority', 'admin']}>
      <MobilityPulseContent />
    </ProtectedRoute>
  );
}

function MobilityPulseContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'corridors' | 'anomalies'>('overview');

  const loadIntelligence = async () => {
    setRefreshing(true);
    try {
      const intel = await api.getUmpnIntelligence();
      setData(intel);
    } catch (err) {
      console.error('Failed to load UMPN intelligence:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIntelligence();
    // Auto-refresh every 10 seconds for real-time vibe
    const timer = setInterval(() => {
      loadIntelligence();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const getDemandColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'medium': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'increasing':
        return <TrendingUp className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'decreasing':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0 rotate-180" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-slate-600 font-medium text-sm">Loading mobility intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/10 to-slate-100 pb-16">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/60 shadow-sm px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link href="/authority">
              <button className="p-2 rounded-xl text-slate-450 hover:text-slate-700 hover:bg-slate-100 transition-all">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/10">
              <Radar className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Urban Mobility Pulse Network (UMPN)</h1>
                <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-2 py-0.5 tracking-wider">Passive Collective Feed</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Real-time movement trends & anonymous telemetry analytics.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-100/60 text-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Privacy Shield Active (Aggregated Core Only)
            </div>
            <button
              onClick={loadIntelligence}
              disabled={refreshing}
              className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-150 relative bg-white"
              title="Refresh intelligence"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="max-w-[1600px] mx-auto px-6 mt-8">
        
        {/* ── Key Overview Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-slate-250 border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Corridors</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-650 text-indigo-600">
                <Compass className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">{data?.corridors.length || 0}</p>
            <p className="text-xs text-slate-500 mt-2">Active inter-city routes logged</p>
          </div>

          <div className="bg-white border border-slate-250 border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Anomalies Detected</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-650 text-rose-600">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">{data?.anomalies.length || 0}</p>
            <p className="text-xs text-slate-500 mt-2">Slowing or diversion patterns</p>
          </div>

          <div className="bg-white border border-slate-250 border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">High-Risk Hotspots</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-650 text-orange-650">
                <Zap className="w-4.5 h-4.5 text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">{data?.hotspots.length || 0}</p>
            <p className="text-xs text-slate-500 mt-2">Forecasted congestion regions</p>
          </div>

          <div className="bg-white border border-slate-250 border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telemetry Contributors</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-650 text-emerald-600">
                <Users className="w-4.5 h-4.5 animate-pulse" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-slate-900">{data?.active_contributors || 148}</p>
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">+{(data?.active_contributors - 148) || 0} user(s)</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Anonymized citizen telemetry lines</p>
          </div>
        </div>

        {/* ── Sub Navigation Tabs ── */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 mb-6 pb-px">
          {[
            { id: 'overview', label: 'Mobility Overview', count: null },
            { id: 'corridors', label: 'Corridor Analysis', count: data?.corridors.length },
            { id: 'anomalies', label: 'Abnormality Feed', count: data?.anomalies.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-650 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Contents ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Main Analytics) */}
          <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  {/* Corridors Overview list */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Compass className="w-5 h-5 text-indigo-500" />
                      Primary Movement Corridors
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data?.corridors.map((c: any) => (
                        <div key={c.id} className="border border-slate-100 hover:border-slate-200/80 rounded-2xl p-4.5 bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-sm text-slate-800">{c.origin} &rarr; {c.destination}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${getDemandColor(c.demand_level)}`}>
                              {c.demand_level} Demand
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Travel Time</span>
                              <span className="text-xs font-bold text-slate-700 block mt-0.5">{c.avg_travel_time_mins}m</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Active Vol</span>
                              <span className="text-xs font-bold text-slate-700 block mt-0.5">{c.active_users}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Delay Trend</span>
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                                {getTrendIcon(c.delay_trend)}
                                {c.delay_trend}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hotspots & early warnings */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-500" />
                      Congestion Hotspot Forecasts (20-30 mins out)
                    </h3>
                    <div className="space-y-4">
                      {data?.hotspots.map((h: any) => (
                        <div key={h.id} className="border border-slate-100 hover:border-slate-200/80 p-4.5 rounded-2xl hover:bg-slate-50 transition-all">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                              <span className="font-extrabold text-sm text-slate-800">{h.location}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                                h.risk === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-orange-50 text-orange-750 border-orange-100 text-orange-700'
                              }`}>
                                {h.risk} Risk
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-500">{h.confidence}% Confidence</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-650 text-slate-600 leading-relaxed bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                            <strong>Reason:</strong> {h.reason} Expected bottleneck forms within <span className="text-rose-650 font-bold">{h.expected_formation_mins} minutes</span>.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'corridors' && (
                <motion.div
                  key="corridors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm overflow-hidden"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-500" />
                    Detailed Corridor Analysis
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Route Path</th>
                          <th className="py-3 px-4">Demand Level</th>
                          <th className="py-3 px-4">Growth / Contraction</th>
                          <th className="py-3 px-4">Avg Travel Time</th>
                          <th className="py-3 px-4">Anonymized Vol</th>
                          <th className="py-3 px-4">Delay Trend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                        {data?.corridors.map((c: any) => (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-800">{c.origin} &rarr; {c.destination}</td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${getDemandColor(c.demand_level)}`}>
                                {c.demand_level}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.growth_pct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {c.growth_pct >= 0 ? `+${c.growth_pct}%` : `${c.growth_pct}%`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">{c.avg_travel_time_mins} mins</td>
                            <td className="py-3.5 px-4 font-mono">{c.active_users} active units</td>
                            <td className="py-3.5 px-4 flex items-center gap-1.5 py-4">
                              {getTrendIcon(c.delay_trend)}
                              <span className="capitalize">{c.delay_trend}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'anomalies' && (
                <motion.div
                  key="anomalies"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-indigo-500" />
                    Mobility Anomaly Feed
                  </h3>
                  <div className="space-y-4">
                    {data?.anomalies.map((anom: any) => (
                      <div key={anom.id} className="border border-slate-100 hover:border-slate-200/80 p-4.5 rounded-2xl bg-slate-50/30 hover:bg-slate-50 transition-all flex flex-col justify-between">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                            <span className="font-bold text-sm text-slate-800">{anom.type}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{anom.location}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">{anom.description}</p>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          <span className="text-indigo-650 text-indigo-600">Impact: {anom.impact}</span>
                          <span className="font-mono">Confidence: {anom.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column (Sidebar Insights & Alerts) */}
          <div className="space-y-6">
            
            {/* Early Warnings Alert Panel */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                Early Warnings (Authorities Only)
              </h3>
              <div className="space-y-3">
                {data?.early_warnings.map((ew: any) => (
                  <div key={ew.id} className="p-3.5 bg-rose-50/50 border border-rose-100/60 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{ew.alert}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        Bottleneck expected within <span className="text-rose-600 font-bold">{ew.expected_formation_mins}m</span> · {ew.confidence}% confidence.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Natural Language Insights */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-600"><Brain className="w-32 h-32" /></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                    <Brain className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">AI Mobility Analyst</h3>
                </div>
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-normal">
                  {data?.insights.map((insight: string, idx: number) => (
                    <div key={idx} className="flex gap-2.5 items-start bg-indigo-50/30 border border-indigo-100/40 p-3.5 rounded-2xl hover:bg-indigo-50/50 transition-all">
                      <span className="text-indigo-600 font-bold shrink-0 mt-0.5">·</span>
                      <p className="text-slate-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Congestion signals */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-indigo-500" />
                Congestion Formation Signals
              </h3>
              <div className="space-y-3">
                {data?.congestion_signals.map((sig: any) => (
                  <div key={sig.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs text-slate-800">{sig.location}</span>
                      <span className="text-[9px] font-mono text-slate-400 shrink-0">{sig.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-normal">{sig.reason}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[9px] font-extrabold text-indigo-650 text-indigo-600 uppercase">
                      <span>{sig.type}</span>
                      <span>{sig.confidence}% conf</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}

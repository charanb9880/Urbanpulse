'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Activity, Sliders, AlertTriangle, CheckCircle2, ChevronRight,
  Sparkles, HelpCircle, RefreshCw, Layers, ArrowLeftRight, Check, Play, Clock,
  Truck, Route, AlertOctagon, Heart, Users, History, Info, BookOpen, MapPin
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface SimulatedDecision {
  id: number;
  scenario_type: string;
  title: string;
  location: string;
  duration_hours: number;
  affected_area: string;
  parameters_json: string;
  mobility_score: number;
  citizen_score: number;
  emergency_score: number;
  risk_score: number;
  results_json: string;
  alternative_strategy: string;
  alternative_reduction_pct?: number;
  ai_reasoning: string;
  creator: string;
  created_at: string;
  results?: any;
  parameters?: any;
}

export default function UrbanDecisionSimulator() {
  const [history, setHistory] = useState<SimulatedDecision[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [scenarioType, setScenarioType] = useState('Road Closure');
  const [simTitle, setSimTitle] = useState('Mysore Road Flyover Maintenance');
  const [simLocation, setSimLocation] = useState('Mysore Road');
  const [simDuration, setSimDuration] = useState(8);
  const [simArea, setSimArea] = useState('Major Arterial Corridor');
  
  // Dynamic parameters mapping
  const [laneClosure, setLaneClosure] = useState(100);
  const [crowdSize, setCrowdSize] = useState(15000);
  const [widthReduction, setWidthReduction] = useState(50);
  const [severityIndex, setSeverityIndex] = useState(6);

  // UDS Memory State
  const [memoryMatches, setMemoryMatches] = useState<SimulatedDecision[]>([]);
  const [loadingMemory, setLoadingMemory] = useState(false);

  // Comparison State
  const [compareMode, setCompareMode] = useState(false);
  const [compareIdA, setCompareIdA] = useState<number | null>(null);
  const [compareIdB, setCompareIdB] = useState<number | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  // General Simulation State
  const [simulating, setSimulating] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await api.getDecisionHistory();
      setHistory(data);
      if (data.length > 0 && selectedSimId === null) {
        setSelectedSimId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to retrieve simulation history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Sync memory match preview when form type or location changes
  useEffect(() => {
    const fetchMemory = async () => {
      setLoadingMemory(true);
      try {
        const matches = await api.getUDSMemory(scenarioType, simLocation);
        setMemoryMatches(matches.slice(0, 2));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMemory(false);
      }
    };

    const debounce = setTimeout(fetchMemory, 500);
    return () => clearTimeout(debounce);
  }, [scenarioType, simLocation]);

  const handleSimulate = async () => {
    setSimulating(true);
    let params: any = {};
    if (scenarioType === 'Road Closure') params = { lane_closure: laneClosure };
    else if (scenarioType === 'Event Impact') params = { crowd_size: crowdSize };
    else if (scenarioType === 'Infrastructure Maintenance') params = { lane_width_reduction: widthReduction };
    else params = { severity_index: severityIndex };

    try {
      const res = await api.simulateDecision({
        scenario_type: scenarioType,
        title: simTitle,
        location: simLocation,
        duration_hours: simDuration,
        affected_area: simArea,
        parameters: params,
        creator: 'Authority Planner'
      });
      
      await fetchHistory();
      setSelectedSimId(res.id);
      setCompareMode(false);
    } catch (e) {
      alert('Simulation failed: ' + e);
    } finally {
      setSimulating(false);
    }
  };

  const handleCompare = async () => {
    if (!compareIdA || !compareIdB) {
      alert('Please select two scenarios to compare.');
      return;
    }
    setComparing(true);
    try {
      const res = await api.compareDecisions(compareIdA, compareIdB);
      setComparisonResult(res);
    } catch (e) {
      alert('Comparison failed: ' + e);
    } finally {
      setComparing(false);
    }
  };

  const selectedSim = history.find(s => s.id === selectedSimId);

  const getRiskCategory = (score: number) => {
    if (score <= 25) return { label: 'Low Risk', bg: 'bg-emerald-55 border-emerald-200 text-emerald-800', color: 'text-emerald-600 stroke-emerald-600' };
    if (score <= 50) return { label: 'Moderate Risk', bg: 'bg-blue-50 border-blue-200 text-blue-800', color: 'text-blue-600 stroke-blue-600' };
    if (score <= 75) return { label: 'High Risk', bg: 'bg-amber-50 border-amber-200 text-amber-800', color: 'text-amber-600 stroke-amber-600' };
    return { label: 'Critical Risk', bg: 'bg-rose-50 border-rose-200 text-rose-800', color: 'text-rose-600 stroke-rose-600' };
  };

  const getMetricColor = (score: number) => {
    if (score < 40) return 'text-emerald-600 stroke-emerald-600';
    if (score < 70) return 'text-amber-600 stroke-amber-600';
    return 'text-rose-600 stroke-rose-600';
  };

  return (
    <ProtectedRoute requiredRole="authority">
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
        
        {/* Header HUD */}
        <header className="border-b border-slate-200 bg-white/75 backdrop-blur-xl px-8 py-5 sticky top-0 z-40">
          <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shadow-sm hover:scale-105 transition-all">
                  <Sliders className="w-6 h-6 text-indigo-650" />
                </div>
              </Link>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-2">
                  Urban Decision Simulator (UDS)
                  <span className="text-[10px] bg-indigo-55 border border-indigo-200 text-indigo-700 font-extrabold px-2 py-0.5 rounded">
                    DECISION INTELLIGENCE MODULE
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                  "See the consequences before making the decision."
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => { setCompareMode(!compareMode); setComparisonResult(null); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wider ${
                  compareMode 
                    ? 'bg-rose-50 border border-rose-200 text-rose-700 font-extrabold shadow-sm' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                {compareMode ? 'Exit Compare Mode' : 'Scenario Comparison'}
              </button>
              <Link
                href="/admin"
                className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors uppercase tracking-wider shadow-sm"
              >
                Operations Portal
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="h-[70vh] flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-550 font-medium">Synchronizing Grid Simulator Memory...</p>
            </div>
          </div>
        ) : (
          <main className="max-w-[1700px] mx-auto p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* ══ LEFT PANEL: Simulation Creator Workspace (4 Cols) ══ */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Creator Workspace Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-indigo-650" />
                  Decision Sandbox Panel
                </h3>
                <p className="text-xs text-slate-550 leading-relaxed">
                  Design a hypothetical event or operation to simulate risk metrics and predict city-wide mobility impact vectors.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Simulation Type</label>
                    <select
                      value={scenarioType}
                      onChange={(e) => {
                        setScenarioType(e.target.value);
                        // Update defaults
                        if (e.target.value === 'Road Closure') {
                          setSimTitle('Mysore Road Flyover Maintenance');
                          setSimLocation('Mysore Road');
                          setSimArea('Major Arterial Corridor');
                        } else if (e.target.value === 'Event Impact') {
                          setSimTitle('Koramangala Cricket Fest Rally');
                          setSimLocation('Koramangala 100ft Road');
                          setSimArea('Central Business District');
                        } else if (e.target.value === 'Infrastructure Maintenance') {
                          setSimTitle('Silk Board Metro Pier Works');
                          setSimLocation('Silk Board Junction');
                          setSimArea('Primary Expressway Junction');
                        } else {
                          setSimTitle('Flooding Overflow Crisis');
                          setSimLocation('Whitefield ITPL Road');
                          setSimArea('Arterial Tech Corridor');
                        }
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    >
                      <option>Road Closure</option>
                      <option>Event Impact</option>
                      <option>Infrastructure Maintenance</option>
                      <option>Emergency Scenario</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Decision Title</label>
                    <input
                      type="text"
                      value={simTitle}
                      onChange={(e) => setSimTitle(e.target.value)}
                      placeholder="e.g. Schedule Maintenance Shift"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Simulation Location</label>
                    <select
                      value={simLocation}
                      onChange={(e) => setSimLocation(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    >
                      <option>Mysore Road</option>
                      <option>Koramangala 100ft Road</option>
                      <option>Silk Board Junction</option>
                      <option>Whitefield ITPL Road</option>
                      <option>HAL Airport Road</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block mb-1.5">Duration (Hours)</label>
                      <input
                        type="number"
                        min="1"
                        max="72"
                        value={simDuration}
                        onChange={(e) => setSimDuration(Math.max(1, Number(e.target.value)))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block mb-1.5">Affected Zone</label>
                      <input
                        type="text"
                        value={simArea}
                        onChange={(e) => setSimArea(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Dynamic Sliders based on type */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <span className="text-[10px] text-indigo-700 font-black uppercase tracking-wider block">Simulation Parameters</span>
                    
                    {scenarioType === 'Road Closure' && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-550 mb-1.5">
                          <span>Lane Closure Percentage</span>
                          <span className="font-mono font-bold text-slate-800">{laneClosure}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="10"
                          value={laneClosure}
                          onChange={(e) => setLaneClosure(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    )}

                    {scenarioType === 'Event Impact' && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-550 mb-1.5">
                          <span>Target Crowd Size</span>
                          <span className="font-mono font-bold text-slate-800">{crowdSize.toLocaleString()}</span>
                        </div>
                        <input
                          type="range"
                          min="1000"
                          max="50000"
                          step="2000"
                          value={crowdSize}
                          onChange={(e) => setCrowdSize(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    )}

                    {scenarioType === 'Infrastructure Maintenance' && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-550 mb-1.5">
                          <span>Lane Width Reduction</span>
                          <span className="font-mono font-bold text-slate-800">{widthReduction}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          step="5"
                          value={widthReduction}
                          onChange={(e) => setWidthReduction(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    )}

                    {scenarioType === 'Emergency Scenario' && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-550 mb-1.5">
                          <span>Severity / Impact Level</span>
                          <span className="font-mono font-bold text-slate-800">{severityIndex} / 10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={severityIndex}
                          onChange={(e) => setSeverityIndex(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-550"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSimulate}
                    disabled={simulating}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-750 hover:to-purple-750 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Calculating grid spillovers...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        Run Simulation
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* City Memory Match Widget */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4.5 h-4.5 text-indigo-650" />
                  City Memory Repository
                </h3>
                <p className="text-[11px] text-slate-550 leading-snug">
                  Matches current parameters against previously completed city simulations to yield historical insights.
                </p>

                {loadingMemory ? (
                  <div className="py-6 text-center text-xs text-slate-500">Checking historical archives...</div>
                ) : memoryMatches.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                    No similar past simulations found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memoryMatches.map((m, idx) => (
                      <div key={m.id || idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-550">
                          <span className="font-bold text-indigo-700 uppercase">Archived Decision</span>
                          <span>{new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800">{m.title}</p>
                        <p className="text-[11px] text-slate-605">
                          <strong>Observed Risk:</strong> {m.risk_score}% overall. Recommendation was: <span className="text-indigo-700 font-medium">{m.alternative_strategy.split(' or ')[0]}</span>.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* ══ RIGHT PANEL: Workspace Display (8 Cols) ══ */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* COMPARISON WORKSPACE */}
              {compareMode ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="font-black text-base text-slate-900 uppercase flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-rose-600" />
                        Dual Decision Comparison Workspace
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Select two simulated scenarios side-by-side to seek preference recommendations.</p>
                    </div>
                  </div>

                  {/* Selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                      <label className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block mb-2">Scenario A</label>
                      <select
                        value={compareIdA || ''}
                        onChange={(e) => { setCompareIdA(Number(e.target.value)); setComparisonResult(null); }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Choose Scenario A --</option>
                        {history.map(s => (
                          <option key={s.id} value={s.id}>{s.title} ({s.location} - {s.risk_score}%)</option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                      <label className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block mb-2">Scenario B</label>
                      <select
                        value={compareIdB || ''}
                        onChange={(e) => { setCompareIdB(Number(e.target.value)); setComparisonResult(null); }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Choose Scenario B --</option>
                        {history.map(s => (
                          <option key={s.id} value={s.id}>{s.title} ({s.location} - {s.risk_score}%)</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleCompare}
                    disabled={!compareIdA || !compareIdB || comparing}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-rose-200/25"
                  >
                    {comparing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                    Compare Decisions
                  </button>

                  {/* Comparison Result HUD */}
                  {comparisonResult && (
                    <div className="space-y-6 pt-4 border-t border-slate-200">
                      
                      {/* Preference Alert */}
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-800 font-black uppercase tracking-wider block">System Decision Preference</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">{comparisonResult.preferred_title} preferred</p>
                          <p className="text-xs text-slate-650 mt-1 leading-relaxed">{comparisonResult.rationale}</p>
                        </div>
                      </div>

                      {/* Side by side stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Scenario A Card */}
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl space-y-4">
                          <h4 className="text-sm font-bold text-indigo-750 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2">
                            <Layers className="w-4 h-4 text-indigo-650" />
                            A: {comparisonResult.scenario_a.title}
                          </h4>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">Risk Level</span>
                            <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${getRiskCategory(comparisonResult.scenario_a.risk_score).bg}`}>
                              {getRiskCategory(comparisonResult.scenario_a.risk_score).label} ({comparisonResult.scenario_a.risk_score}%)
                            </span>
                          </div>
                          <div className="space-y-2.5 text-xs text-slate-700">
                            <div><strong>Traffic:</strong> {comparisonResult.scenario_a.results.traffic}</div>
                            <div><strong>Citizen:</strong> {comparisonResult.scenario_a.results.citizen}</div>
                            <div><strong>Emergency:</strong> {comparisonResult.scenario_a.results.emergency}</div>
                          </div>
                        </div>

                        {/* Scenario B Card */}
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl space-y-4">
                          <h4 className="text-sm font-bold text-purple-750 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2">
                            <Layers className="w-4 h-4 text-purple-650" />
                            B: {comparisonResult.scenario_b.title}
                          </h4>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">Risk Level</span>
                            <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${getRiskCategory(comparisonResult.scenario_b.risk_score).bg}`}>
                              {getRiskCategory(comparisonResult.scenario_b.risk_score).label} ({comparisonResult.scenario_b.risk_score}%)
                            </span>
                          </div>
                          <div className="space-y-2.5 text-xs text-slate-700">
                            <div><strong>Traffic:</strong> {comparisonResult.scenario_b.results.traffic}</div>
                            <div><strong>Citizen:</strong> {comparisonResult.scenario_b.results.citizen}</div>
                            <div><strong>Emergency:</strong> {comparisonResult.scenario_b.results.emergency}</div>
                          </div>
                        </div>

                      </div>

                    </div>
                  )}

                </div>
              ) : !selectedSim ? (
                <div className="h-[60vh] bg-white border border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">No Simulation Matches</h3>
                  <p className="text-xs text-slate-550 max-w-md">
                    Select a previously simulated decision from the log below, or run a new simulation on the left sandbox.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 animate-fadeIn">

                  {/* ACTIVE SIMULATION REPORT */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
                      <div>
                        <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded uppercase font-mono">
                          {selectedSim.scenario_type}
                        </span>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">{selectedSim.title}</h2>
                        <p className="text-xs text-slate-550 mt-1 flex items-center gap-1.5 font-mono">
                          <MapPin className="w-3.5 h-3.5" /> {selectedSim.location} ({selectedSim.affected_area}) | <Clock className="w-3.5 h-3.5" /> {selectedSim.duration_hours} Hrs
                        </p>
                      </div>
                      <div className={`px-4 py-2 border rounded-2xl flex flex-col justify-center items-center font-bold text-center self-start md:self-center ${getRiskCategory(selectedSim.risk_score).bg}`}>
                        <span className="text-[10px] uppercase font-mono tracking-widest leading-none">Overall Risk</span>
                        <span className="text-lg font-black mt-1 leading-none">{getRiskCategory(selectedSim.risk_score).label}</span>
                      </div>
                    </div>

                    {/* Score Gauge Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      
                      {/* Overall Dial */}
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-3xl text-center flex flex-col items-center justify-center">
                        <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider block mb-3">Overall Risk Index</span>
                        <div className="relative w-24 h-24 flex items-center justify-center mb-1">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="38" className="stroke-slate-200" strokeWidth="6" fill="transparent" />
                            <circle cx="48" cy="48" r="38" className={`${getRiskCategory(selectedSim.risk_score).color}`} strokeWidth="6" fill="transparent" strokeDasharray={2*Math.PI*38} strokeDashoffset={2*Math.PI*38*(1-selectedSim.risk_score/100)} strokeLinecap="round" />
                          </svg>
                          <span className="absolute text-xl font-black text-slate-900">{selectedSim.risk_score}%</span>
                        </div>
                      </div>

                      {/* Mobility Dial */}
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-3xl text-center flex flex-col items-center justify-center">
                        <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider block mb-3">Mobility Impact</span>
                        <div className="relative w-24 h-24 flex items-center justify-center mb-1">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="38" className="stroke-slate-200" strokeWidth="6" fill="transparent" />
                            <circle cx="48" cy="48" r="38" className={`${getMetricColor(selectedSim.mobility_score)}`} strokeWidth="6" fill="transparent" strokeDasharray={2*Math.PI*38} strokeDashoffset={2*Math.PI*38*(1-selectedSim.mobility_score/100)} strokeLinecap="round" />
                          </svg>
                          <span className="absolute text-xl font-black text-slate-900">{selectedSim.mobility_score}</span>
                        </div>
                      </div>

                      {/* Citizen Dial */}
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-3xl text-center flex flex-col items-center justify-center">
                        <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider block mb-3">Citizen Disruption</span>
                        <div className="relative w-24 h-24 flex items-center justify-center mb-1">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="38" className="stroke-slate-200" strokeWidth="6" fill="transparent" />
                            <circle cx="48" cy="48" r="38" className={`${getMetricColor(selectedSim.citizen_score)}`} strokeWidth="6" fill="transparent" strokeDasharray={2*Math.PI*38} strokeDashoffset={2*Math.PI*38*(1-selectedSim.citizen_score/100)} strokeLinecap="round" />
                          </svg>
                          <span className="absolute text-xl font-black text-slate-900">{selectedSim.citizen_score}</span>
                        </div>
                      </div>

                      {/* Emergency Access Dial */}
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-3xl text-center flex flex-col items-center justify-center">
                        <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider block mb-3">Emergency Response Delay</span>
                        <div className="relative w-24 h-24 flex items-center justify-center mb-1">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="38" className="stroke-slate-200" strokeWidth="6" fill="transparent" />
                            <circle cx="48" cy="48" r="38" className={`${getMetricColor(selectedSim.emergency_score)}`} strokeWidth="6" fill="transparent" strokeDasharray={2*Math.PI*38} strokeDashoffset={2*Math.PI*38*(1-selectedSim.emergency_score/100)} strokeLinecap="round" />
                          </svg>
                          <span className="absolute text-xl font-black text-slate-900">{selectedSim.emergency_score}</span>
                        </div>
                      </div>

                    </div>

                    {/* AI Reasoning Panel */}
                    <div className="p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-indigo-100 rounded-2xl">
                      <h4 className="text-[10px] text-indigo-700 font-black uppercase flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-4 h-4" />
                        Explainable AI Forecast Rationale
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">{selectedSim.ai_reasoning}</p>
                    </div>

                    {/* Tabbed Impact Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Traffic & Commuter details */}
                      <div className="bg-slate-50 p-5 border border-slate-200 rounded-3xl space-y-4">
                        <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-200">
                          <Route className="w-4.5 h-4.5" /> Traffic & Commuter Impact
                        </h4>
                        <div className="space-y-3.5 text-xs">
                          <div className="flex justify-between items-center text-slate-650">
                            <span>Estimated Delay Increase</span>
                            <span className="font-mono text-rose-600 font-bold">+{selectedSim.results?.avg_delay_increase_mins || (selectedSim.duration_hours * 3)} Mins</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-650">
                            <span>Commuters Disrupted</span>
                            <span className="font-mono text-slate-900 font-bold">{selectedSim.results?.affected_commuters?.toLocaleString() || '12,000'} Users</span>
                          </div>
                          <p className="text-slate-605 mt-2 leading-relaxed border-t border-slate-200 pt-3">
                            <strong>Congestion Vector:</strong> {selectedSim.results?.traffic}
                          </p>
                        </div>
                      </div>

                      {/* Emergency & Citizen access details */}
                      <div className="bg-slate-50 p-5 border border-slate-200 rounded-3xl space-y-4">
                        <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-200">
                          <AlertOctagon className="w-4.5 h-4.5" /> Emergency & Public Services
                        </h4>
                        <div className="space-y-3 text-xs leading-relaxed text-slate-605">
                          <div>
                            <strong>Citizen Safety:</strong> {selectedSim.results?.citizen}
                          </div>
                          <div className="border-t border-slate-200 pt-3 mt-3">
                            <strong>Emergency Transit:</strong> {selectedSim.results?.emergency}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Alternative Optimization Strategies */}
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-4">
                      <div className="flex justify-between items-center border-b border-emerald-100 pb-2">
                        <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4.5 h-4.5" />
                          AI Suggested Alternative Strategy
                        </h4>
                        <span className="text-[10px] bg-emerald-100 border border-emerald-250 text-emerald-850 font-bold px-2 py-0.5 rounded">
                          EXPECTED IMPACT REDUCTION: {selectedSim.alternative_reduction_pct || 30}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-705 leading-relaxed font-semibold">
                        {selectedSim.alternative_strategy}
                      </p>
                    </div>

                    {/* Resources required */}
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Truck className="w-4.5 h-4.5 text-slate-650" />
                        Recommended Emergency Resource Standby
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-white rounded-xl text-center border border-slate-200">
                          <Truck className="w-4.5 h-4.5 text-rose-600 mx-auto mb-1" />
                          <span className="text-sm font-bold block text-slate-800">
                            {selectedSim.scenario_type === 'Emergency Scenario' ? 4 : 1}
                          </span>
                          <span className="text-[8px] uppercase text-slate-550 font-bold">Emergency units</span>
                        </div>
                        <div className="p-3 bg-white rounded-xl text-center border border-slate-200">
                          <Users className="w-4.5 h-4.5 text-blue-600 mx-auto mb-1" />
                          <span className="text-sm font-bold block text-slate-800">
                            {selectedSim.scenario_type === 'Event Impact' ? 10 : selectedSim.scenario_type === 'Road Closure' ? 6 : 4}
                          </span>
                          <span className="text-[8px] uppercase text-slate-550 font-bold">Traffic officers</span>
                        </div>
                        <div className="p-3 bg-white rounded-xl text-center border border-slate-200">
                          <Shield className="w-4.5 h-4.5 text-indigo-650 mx-auto mb-1" />
                          <span className="text-sm font-bold block text-slate-800">
                            {selectedSim.scenario_type === 'Emergency Scenario' ? 12 : 3}
                          </span>
                          <span className="text-[8px] uppercase text-slate-550 font-bold">Support personnel</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-605 mt-2">
                        <strong>Reason:</strong> {selectedSim.results?.resource}
                      </p>
                    </div>

                  </div>

                </div>
              )}

              {/* SIMULATION LOGS / HISTORY LIST */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <History className="w-4.5 h-4.5 text-slate-655" />
                  Decision Simulation Log History
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {history.map(s => {
                    const isActive = s.id === selectedSimId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedSimId(s.id); setCompareMode(false); }}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                          isActive && !compareMode
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-sm'
                            : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-250'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="font-bold text-xs text-slate-800 line-clamp-1">
                            {s.title}
                          </h4>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase border shrink-0 ${
                            s.risk_score >= 76 
                              ? 'bg-rose-50 border-rose-200 text-rose-800' 
                              : s.risk_score >= 51 
                                ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            {s.risk_score}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {s.scenario_type} | {s.location}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </main>
        )}

      </div>
    </ProtectedRoute>
  );
}

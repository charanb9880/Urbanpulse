'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Activity, Siren, Clock, Compass, Heart, Route, Truck,
  Sliders, AlertTriangle, CheckCircle2, ChevronRight, Sparkles, HelpCircle, RefreshCw, Send, Check
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface EmergencyChain {
  id: number;
  incident_id: number;
  status: string;
  severity: string;
  potential_casualties: string;
  response_priority: string;
  hospital_id: string;
  hospital_name: string;
  hospital_reason: string;
  hospital_eta: number;
  corridor_primary: string;
  corridor_alt: string;
  corridor_eta: number;
  golden_hour_score: number;
  golden_hour_explanation: string;
  ambulances: number;
  traffic_officers: number;
  emergency_units: number;
  resource_reason: string;
  timeline: any[];
  incident_title: string;
  incident_location: string;
  incident_category: string;
}

interface Alert {
  id: number;
  incident_id: number;
  title: string;
  eta_minutes: number;
  priority: string;
  prep_recommendation: string;
  created_at: string;
  incident_location: string;
}

export default function EmergencyCommandCenter() {
  const [chains, setChains] = useState<EmergencyChain[]>([]);
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState({ distance: 30, trauma: 40, icu: 30 });
  const [updatingWeights, setUpdatingWeights] = useState(false);
  const [dispatchedUnits, setDispatchedUnits] = useState<Record<number, boolean>>({});

  // Simulation State
  const [simTitle, setSimTitle] = useState('Major Collision on Sarjapur Road');
  const [simLocation, setSimLocation] = useState('Sarjapur Road Junction');
  const [simCategory, setSimCategory] = useState('Road Accident');
  const [simSeverity, setSimSeverity] = useState('Critical');
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const chainsData = await api.getEmergencyChains();
      setChains(chainsData);
      
      if (chainsData.length > 0 && selectedChainId === null) {
        setSelectedChainId(chainsData[0].incident_id);
      }
      
      const alertsData = await api.getEmergencyAlerts();
      setAlerts(alertsData);
    } catch (e) {
      console.error('Failed to fetch emergency chains', e);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (key: 'distance' | 'trauma' | 'icu', value: number) => {
    setWeights(prev => {
      const next = { ...prev, [key]: value };
      return next;
    });
  };

  const saveWeights = async () => {
    setUpdatingWeights(true);
    try {
      const total = weights.distance + weights.trauma + weights.icu;
      const d = weights.distance / total;
      const t = weights.trauma / total;
      const i = weights.icu / total;
      await api.configureHospitals(d, t, i);
      // Refresh chain calculations
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingWeights(false);
    }
  };

  const handleResolve = async (incidentId: number) => {
    if (!confirm('Resolve this emergency response chain?')) return;
    try {
      await api.resolveEmergencyChain(incidentId);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const triggerSimulation = async () => {
    setSimulating(true);
    try {
      const res = await api.simulateEmergencyIncident({
        title: simTitle,
        description: `Simulated ${simSeverity.toLowerCase()} emergency report: ${simTitle} near ${simLocation}. Requires coordination.`,
        category: simCategory,
        location: simLocation,
        severity: simSeverity,
        lat: 12.9345,
        lng: 77.6265
      });
      await fetchData();
      if (res.incident) {
        setSelectedChainId(res.incident.id);
      }
    } catch (e) {
      alert('Simulation failed: ' + e);
    } finally {
      setSimulating(false);
    }
  };

  const handleDispatch = (chainId: number) => {
    setDispatchedUnits(prev => ({ ...prev, [chainId]: true }));
    setTimeout(() => {
      alert('Emergency Dispatch signals successfully synchronized with dynamic corridor light sequence. Green Wave Preemption Active.');
    }, 100);
  };

  const selectedChain = chains.find(c => c.incident_id === selectedChainId);

  // Score colors for Golden Hour (light theme compatible)
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 stroke-emerald-600';
    if (score >= 60) return 'text-amber-600 stroke-amber-600';
    return 'text-rose-600 stroke-rose-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-250 text-emerald-800';
    if (score >= 60) return 'bg-amber-50 border-amber-250 text-amber-800';
    return 'bg-rose-50 border-rose-250 text-rose-800';
  };

  return (
    <ProtectedRoute requiredRole="authority">
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
        {/* HUD Header */}
        <header className="border-b border-slate-200 bg-white/75 backdrop-blur-xl px-8 py-5 sticky top-0 z-40">
          <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-sm hover:scale-105 transition-all">
                  <Siren className="w-6 h-6 text-rose-600 animate-pulse" />
                </div>
              </Link>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-2">
                  Emergency Command Center
                  <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 font-extrabold px-2 py-0.5 rounded">
                    ECI LAYER ACTIVE
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                  UrbanPulse Tactical Incident Management & Golden Hour Optimizer
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:self-end">
              <div className="px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700">
                SYSTEM: CO-ORDINATED PREEMPTION
              </div>
              <button 
                onClick={fetchData}
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-550 hover:text-slate-900 transition-all shadow-sm"
                title="Force Refresh Data"
              >
                <RefreshCw className="w-4.5 h-4.5" />
              </button>
              <Link
                href="/admin"
                className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-sm"
              >
                Back to Operations
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="h-[70vh] flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-550 font-medium">Synchronizing Emergency Assets...</p>
            </div>
          </div>
        ) : (
          <main className="max-w-[1700px] mx-auto p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* ══ LEFT COLUMN: Active Emergencies & Simulator (3 Cols) ══ */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Active Emergencies Sidebar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-rose-600" />
                    Active Emergency Chains
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 rounded-full font-bold text-slate-600">
                    {chains.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {chains.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                      No active emergency dispatches.
                    </div>
                  ) : (
                    chains.map(c => {
                      const isActive = c.incident_id === selectedChainId;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedChainId(c.incident_id)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            isActive
                              ? 'bg-rose-50 border-rose-200 text-slate-900 shadow-sm'
                              : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-250'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="font-bold text-sm text-slate-800 line-clamp-1">
                              {c.incident_title}
                            </h4>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border shrink-0 ${
                              c.severity === 'Critical' 
                                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                              {c.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 flex items-center gap-1">
                            <Compass className="w-3 h-3 text-slate-400" /> {c.incident_location}
                          </p>
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 text-[10px] font-mono">
                            <span className="text-slate-605">ETA: {c.hospital_eta}m</span>
                            <span className={`font-bold ${isActive ? 'text-rose-700' : 'text-slate-500'}`}>
                              PRIORITY: {c.response_priority}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Emergency Simulator Tool */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-4">
                  <Sparkles className="w-4.5 h-4.5 text-blue-600" />
                  ECI Simulator Workspace
                </h3>
                <p className="text-xs text-slate-550 leading-relaxed mb-4">
                  Inject mock incident data to demonstrate real-time assessment, Golden Hour optimizer scoring, and hospital recommendations.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Incident Title</label>
                    <input 
                      type="text" 
                      value={simTitle}
                      onChange={e => setSimTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Junction Location</label>
                    <select 
                      value={simLocation} 
                      onChange={e => setSimLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
                    >
                      <option>Sarjapur Road Junction</option>
                      <option>Silk Board Junction</option>
                      <option>Koramangala 80ft Road</option>
                      <option>HAL Airport Road</option>
                      <option>Whitefield ITPL Road</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Category</label>
                      <select 
                        value={simCategory} 
                        onChange={e => setSimCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
                      >
                        <option>Road Accident</option>
                        <option>Fire Incident</option>
                        <option>Medical Emergency</option>
                        <option>Road Disaster</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Severity</label>
                      <select 
                        value={simSeverity} 
                        onChange={e => setSimSeverity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
                      >
                        <option>Critical</option>
                        <option>High</option>
                        <option>Medium</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={triggerSimulation}
                    disabled={simulating}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                  >
                    {simulating ? 'Synthesizing emergency chain...' : 'Simulate ECI Incident'}
                  </button>
                </div>
              </div>

              {/* Alerts Ticker */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-4">
                  <Siren className="w-4.5 h-4.5 text-rose-600" />
                  Readiness alerts
                </h3>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-slate-550 py-4 text-center">No alerts broadcasted.</p>
                  ) : (
                    alerts.map((a, idx) => (
                      <div key={a.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] leading-snug">
                        <div className="flex justify-between items-center mb-1 text-slate-600">
                          <span className="font-bold text-rose-600 uppercase">Alert #{a.incident_id}</span>
                          <span className="font-mono text-slate-500">{a.eta_minutes}m ETA</span>
                        </div>
                        <p className="text-slate-800 font-semibold">{a.title}</p>
                        <p className="text-slate-600 mt-1 font-medium">Recommended: <span className="text-rose-700 font-medium">{a.prep_recommendation}</span></p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* ══ RIGHT WORKSPACE: 9 Columns ══ */}
            <div className="lg:col-span-9 space-y-8">
              
              {!selectedChain ? (
                <div className="h-[60vh] bg-white border border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">No Active Incidents Selected</h3>
                  <p className="text-xs text-slate-550 max-w-md">
                    Select an active emergency chain from the list on the left, or use the simulator tool to inject a new mock incident report.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Row 1: Workflow steps & Golden Hour */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* Step 2 Panel: Visual Emergency Workflow Chain */}
                    <div className="md:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                            Emergency Response Chain Orchestrator
                          </h3>
                          <span className="text-[10px] font-mono bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded font-bold">
                            STEP-BY-STEP FLOW
                          </span>
                        </div>

                        {/* Interactive flow tracker */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
                          {[
                            { name: 'Incident', stage: 'Reported' },
                            { name: 'Verification', stage: 'Verified' },
                            { name: 'Assessment', stage: 'Emergency Assessed' },
                            { name: 'Hospital Recommend', stage: 'Hospital Recommended' },
                            { name: 'Green Routing', stage: 'Route Generated' },
                            { name: 'Monitoring', stage: 'Active' }
                          ].map((step, idx) => {
                            const isCompleted = selectedChain.timeline.some(t => t.stage === step.stage) || 
                                              (step.stage === 'Active' && selectedChain.status === 'Active');
                            return (
                              <div key={idx} className="flex flex-col items-center text-center p-3.5 bg-slate-50 border border-slate-100 rounded-2xl relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs mb-2.5 relative z-10 transition-all ${
                                  isCompleted
                                    ? 'bg-rose-50 border-rose-450 text-rose-700 shadow-sm animate-pulse'
                                    : 'bg-white border-slate-205 text-slate-400'
                                }`}>
                                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                                </div>
                                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide block leading-tight">
                                  {step.name}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono mt-1 uppercase block leading-none">
                                  {isCompleted ? 'SYNCED' : 'PENDING'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-4 text-xs">
                        <div className="text-slate-600 leading-snug">
                          <span className="font-bold text-slate-800">Incident status:</span> ECI coordinates are synced. Green Corridor wave parameters computed.
                        </div>
                        <button
                          onClick={() => handleResolve(selectedChain.incident_id)}
                          className="px-4 py-2 bg-white hover:bg-slate-50 text-rose-600 hover:text-rose-700 font-bold rounded-xl border border-slate-200 shadow-sm transition-colors"
                        >
                          Conclude Emergency
                        </button>
                      </div>
                    </div>

                    {/* Step 6 Panel: Golden Hour Optimizer Dial */}
                    <div className="md:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between text-center">
                      <div className="w-full flex justify-between items-center mb-4">
                        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                          Golden Hour Optimizer™
                        </h3>
                        <span title="Calculates efficiency index of the first hour intervention window.">
                          <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                        </span>
                      </div>

                      {/* Radial Meter SVG */}
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="72"
                            cy="72"
                            r="56"
                            className="stroke-slate-100"
                            strokeWidth="10"
                            fill="transparent"
                          />
                          <circle
                            cx="72"
                            cy="72"
                            r="56"
                            className={`transition-all duration-1000 ${getScoreColor(selectedChain.golden_hour_score)}`}
                            strokeWidth="10"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 56}
                            strokeDashoffset={2 * Math.PI * 56 * (1 - selectedChain.golden_hour_score / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black tracking-tight text-slate-900 leading-none">
                            {selectedChain.golden_hour_score}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mt-1">
                            SCORE
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 w-full">
                        <div className={`text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full border mb-3 w-fit mx-auto ${getScoreBg(selectedChain.golden_hour_score)}`}>
                          {selectedChain.golden_hour_score >= 80 ? 'Excellent Efficiency' : selectedChain.golden_hour_score >= 60 ? 'Good Efficiency' : 'Critical Action Required'}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed max-w-[240px] mx-auto font-medium">
                          {selectedChain.golden_hour_explanation}
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Row 2: Hospital Rec Engine & Green Corridor Route */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* Step 3: Hospital Intelligence Engine (Configurable) */}
                    <div className="md:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                          Hospital Intelligence Engine
                        </h3>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold uppercase font-mono">
                          Configurable
                        </span>
                      </div>

                      {/* Recommended Hospital Details */}
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[9px] text-slate-550 font-bold uppercase tracking-widest block">Recommended Facility</span>
                            <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/10 shrink-0" />
                              {selectedChain.hospital_name}
                            </h4>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-550 font-bold uppercase tracking-widest block font-mono">Travel ETA</span>
                            <span className="text-base font-bold text-rose-700 font-mono mt-0.5 block">
                              {selectedChain.hospital_eta} Min
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-650 mt-3 border-t border-slate-200 pt-3 leading-relaxed">
                          <strong>Rationale:</strong> {selectedChain.hospital_reason}
                        </p>
                      </div>

                      {/* Hospital Weight Configuration Form */}
                      <div className="bg-slate-50 border border-slate-200/65 p-4 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase">
                          <Sliders className="w-4 h-4 text-slate-500" />
                          Recommendation Weight Parameters
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs text-slate-550 mb-1">
                              <span>Distance Proximity Weight</span>
                              <span className="font-bold">{weights.distance}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={weights.distance}
                              onChange={e => handleWeightChange('distance', Number(e.target.value))}
                              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-slate-550 mb-1">
                              <span>Trauma Support Capability</span>
                              <span className="font-bold">{weights.trauma}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={weights.trauma}
                              onChange={e => handleWeightChange('trauma', Number(e.target.value))}
                              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-slate-550 mb-1">
                              <span>ICU Bed Availability</span>
                              <span className="font-bold">{weights.icu}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={weights.icu}
                              onChange={e => handleWeightChange('icu', Number(e.target.value))}
                              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                          </div>
                        </div>

                        <button
                          onClick={saveWeights}
                          disabled={updatingWeights}
                          className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-blue-650 hover:text-blue-750 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          {updatingWeights ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sliders className="w-3.5 h-3.5" />
                          )}
                          Re-Calculate recommendations
                        </button>
                      </div>
                    </div>

                    {/* Step 5: Smart Green Corridor Planner */}
                    <div className="md:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                        Smart Green Corridor Planner
                      </h3>

                      {/* Primary Corridor Details */}
                      <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wide">
                            Primary Green Corridor
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase font-mono border border-emerald-250">
                            Green Wave Enabled
                          </span>
                        </div>
                        <p className="text-xs text-slate-900 font-bold leading-relaxed">
                          {selectedChain.corridor_primary}
                        </p>
                        <div className="text-[10px] text-slate-600 mt-2 font-mono flex gap-4 font-medium">
                          <span>ETA: {selectedChain.corridor_eta} Minutes</span>
                          <span>Priority Lane Sync: 100%</span>
                        </div>
                      </div>

                      {/* Alternative Corridor Details */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[10px] text-slate-600 font-extrabold uppercase block mb-2">
                          Alternative preemption corridor
                        </span>
                        <p className="text-xs text-slate-800">
                          {selectedChain.corridor_alt}
                        </p>
                        <div className="text-[10px] text-slate-600 mt-2 font-mono flex gap-4 font-medium">
                          <span>ETA: {selectedChain.corridor_eta + 4} Minutes</span>
                          <span>Priority Lane Sync: Standby</span>
                        </div>
                      </div>

                      {/* Stylized Tactical map trace */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider block">Corridor Vector Trace</span>
                        <div className="h-10 flex items-center justify-between px-3 text-xs bg-white border border-slate-200 rounded-xl relative">
                          <div className="flex items-center gap-1 text-slate-700 font-bold">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            Incident
                          </div>
                          
                          {/* Animated vector line */}
                          <div className="flex-1 mx-3 h-0.5 bg-slate-200 relative overflow-hidden">
                            <div className="absolute inset-y-0 h-full w-12 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" style={{ animationDuration: '1.5s', animationIterationCount: 'infinite' }} />
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            {selectedChain.hospital_name.split(' ')[0]}
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Row 3: Resource Coordination & AI Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* Step 7: Emergency Resource Coordination */}
                    <div className="md:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                        Emergency Resource Coordinator
                      </h3>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-2xl text-center">
                          <Truck className="w-5 h-5 text-red-650 mx-auto mb-1.5" />
                          <span className="text-[20px] font-black text-slate-900 block">
                            {selectedChain.ambulances}
                          </span>
                          <span className="text-[9px] text-slate-550 font-bold uppercase block">
                            Ambulances
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-2xl text-center">
                          <Compass className="w-5 h-5 text-blue-650 mx-auto mb-1.5" />
                          <span className="text-[20px] font-black text-slate-900 block">
                            {selectedChain.traffic_officers}
                          </span>
                          <span className="text-[9px] text-slate-550 font-bold uppercase block">
                            Traffic units
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-2xl text-center">
                          <Siren className="w-5 h-5 text-amber-650 mx-auto mb-1.5" />
                          <span className="text-[20px] font-black text-slate-900 block">
                            {selectedChain.emergency_units}
                          </span>
                          <span className="text-[9px] text-slate-550 font-bold uppercase block">
                            Response Teams
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-3.5 border border-slate-200 rounded-xl leading-relaxed font-medium">
                        <strong>Reasoning:</strong> {selectedChain.resource_reason}
                      </p>

                      <button
                        onClick={() => handleDispatch(selectedChain.incident_id)}
                        disabled={dispatchedUnits[selectedChain.incident_id]}
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase ${
                          dispatchedUnits[selectedChain.incident_id]
                            ? 'bg-emerald-50 border border-emerald-250 text-emerald-800'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/10'
                        }`}
                      >
                        {dispatchedUnits[selectedChain.incident_id] ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Units Dispatched
                          </>
                        ) : (
                          <>
                            <Siren className="w-4 h-4" /> Dispatch Coordinated Units
                          </>
                        )}
                      </button>
                    </div>

                    {/* AI Insights & Step 9 Timeline */}
                    <div className="md:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                      <div className="space-y-4">
                        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                          ECI Incident Insights & Timeline
                        </h3>

                        {/* AI Insights Box */}
                        <div className="p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-100 rounded-2xl">
                          <h4 className="text-[10px] text-blue-700 font-extrabold uppercase flex items-center gap-1.5 mb-2.5">
                            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" /> Explainable AI Forecast
                          </h4>
                          <ul className="text-xs text-slate-700 space-y-2 leading-relaxed font-medium">
                            <li className="flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              <span>Potential traffic spillover expected in {selectedChain.hospital_eta + 5} minutes along secondary connectors.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              <span>{selectedChain.hospital_name} provides the fastest trauma response for this geographical sector.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              <span>Deploying traffic personnel near {selectedChain.incident_location.split(',')[0]} will speed up clearance by 18%.</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Step 9 Timeline list */}
                      <div className="mt-4 space-y-2.5">
                        <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block">Lifecycle Timeline Log</span>
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {selectedChain.timeline.map((t, index) => (
                            <div key={index} className="flex items-start gap-3.5 text-[11px] leading-snug">
                              <span className="font-mono text-slate-500 shrink-0">
                                {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                              <div className="flex-1">
                                <span className="font-bold text-slate-800">{t.label}:</span>{' '}
                                <span className="text-slate-600">{t.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
            
          </main>
        )}
      </div>
    </ProtectedRoute>
  );
}

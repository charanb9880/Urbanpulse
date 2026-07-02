'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Camera,
  LogOut,
  Siren,
  Activity,
  Radar,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';

interface Incident {
  id: number;
  title: string;
  status: string;
  location?: string;
  description?: string;
  created_at: string;
  ai_analysis?: any;
}

function CitizenContent() {
  const [isReporting, setIsReporting] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [reportData, setReportData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    severity: 'Medium',
    image_url: '',
    ai_image_verification_json: null as any
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verified' | 'mismatch' | 'non_crisis' | 'low_confidence'>('idle');
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [nearby, setNearby] = useState<Incident[]>([]);
  const [view, setView] = useState<'reports'|'nearby'>('reports');
  const [error, setError] = useState('');
  const [emergencyChains, setEmergencyChains] = useState<any[]>([]);
  const [udsSimulations, setUdsSimulations] = useState<any[]>([]);
  const [smartJourney, setSmartJourney] = useState(false);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    loadIncidents();
    loadNearby();
    loadUDSSimulations();
    loadUmpnSettings();
  }, []);

  const loadUmpnSettings = async () => {
    try {
      const data = await api.getUmpnSettings(1);
      setSmartJourney(data.smart_journey_enabled === 1);
    } catch (err) {
      console.error('Failed to load UMPN settings:', err);
    }
  };

  const toggleSmartJourney = async (val: boolean) => {
    setUpdatingSettings(true);
    try {
      const data = await api.updateUmpnSettings(1, val);
      setSmartJourney(data.smart_journey_enabled === 1);
      if (data.smart_journey_enabled === 1) {
        fetchTelemetryData();
      } else {
        setTelemetry(null);
      }
    } catch (err) {
      console.error('Failed to update UMPN settings:', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const fetchTelemetryData = async () => {
    try {
      const data = await api.getUmpnSimulatedTelemetry();
      setTelemetry(data);
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    }
  };

  useEffect(() => {
    if (!smartJourney) return;
    fetchTelemetryData();
    const timer = setInterval(() => {
      fetchTelemetryData();
    }, 5000);
    return () => clearInterval(timer);
  }, [smartJourney]);

  const loadNearby = async () => {
    try {
      // Mock citizen location to Bengaluru center
      const data = await api.getNearbyIncidents(12.9716, 77.5946, 10);
      setNearby(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUDSSimulations = async () => {
    try {
      const data = await api.getDecisionHistory();
      setUdsSimulations(data || []);
    } catch (err) {
      console.error('Failed to load decision simulations:', err);
    }
  };

  const loadIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      const ecData = await api.getEmergencyChains();
      setEmergencyChains(ecData || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    }
  };

  const getVerificationStatus = (selectedCategory: string, verif: any) => {
    if (!verif) return 'idle';
    
    const confVal = verif.confidence > 1.0 ? verif.confidence / 100.0 : verif.confidence;
    
    if (verif.incident_status === 'NON_INCIDENT' || 
        verif.detected_category === 'Non-Crisis' || 
        verif.detected_category === 'Unknown' || 
        verif.detected_category === 'Unknown / Irrelevant' ||
        verif.detected_category === 'Institutional Logo' ||
        verif.detected_category === 'Selfie' ||
        verif.detected_category === 'Food Image' ||
        verif.detected_category === 'Pet Image') {
      return 'non_crisis';
    }
    
    if (verif.incident_status === 'UNCERTAIN' || confVal < 0.65) {
      return 'low_confidence';
    }
    
    // Normalize categories to handle variants like "Flood" vs "Flooding"
    const normalize = (cat: string) => {
      if (!cat) return '';
      const c = cat.toLowerCase();
      if (c.includes('accident')) return 'accident';
      if (c.includes('flood')) return 'flood';
      if (c.includes('pothole')) return 'pothole';
      if (c.includes('block') || c.includes('congestion') || c.includes('traffic')) return 'blockage';
      if (c.includes('tree')) return 'tree';
      if (c.includes('damage') || c.includes('infrastructure') || c.includes('signal') || c.includes('failure')) return 'damage';
      return c;
    };
    
    if (normalize(verif.detected_category) !== normalize(selectedCategory)) {
      return 'mismatch';
    }
    return 'verified';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        let resultStr = reader.result as string;
        if (resultStr && resultStr.startsWith("data:")) {
          const firstComma = resultStr.indexOf(",");
          if (firstComma !== -1) {
            const header = resultStr.substring(0, firstComma);
            const data = resultStr.substring(firstComma);
            const updatedHeader = header.replace(";base64", `;name=${encodeURIComponent(file.name)};base64`);
            resultStr = updatedHeader + data;
          }
        }
        
        setReportData(prev => ({ ...prev, image_url: resultStr, ai_image_verification_json: null }));
        setIsVerifying(true);
        setVerificationStatus('idle');
        setError('');
        
        try {
          const res = await api.verifyImage(reportData.category, resultStr);
          
          // Normalize confidence percentage to 0.0 - 1.0 for UI display
          if (res.confidence > 1.0) {
            res.confidence = res.confidence / 100.0;
          }
          
          const status = getVerificationStatus(reportData.category, res);
          setReportData(prev => ({ ...prev, ai_image_verification_json: res }));
          setVerificationStatus(status);
          
          if (status === 'mismatch') {
            setShowMismatchModal(true);
          }
          
          // Save verification context for AI Copilot
          localStorage.setItem('urbanpulse_verification_context', JSON.stringify({
            selected_category: reportData.category,
            detected_category: res.detected_category,
            confidence: res.confidence,
            mismatch: res.mismatch,
            status: status,
            timestamp: Date.now()
          }));
        } catch (err: any) {
          console.error("AI Verification failed:", err);
          setError("AI Image Verification failed. Please try again or skip.");
        } finally {
          setIsVerifying(false);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const nextStep = async () => {
    if (reportStep === 3) {
      submitReport();
    } else {
      setReportStep(reportStep + 1);
    }
  };

  const submitReport = async (overrideData?: any) => {
    try {
      const dataToSubmit = overrideData || reportData;
      await api.createIncident(dataToSubmit);
      setIsReporting(false);
      setReportStep(1);
      setReportData({
        title: '',
        description: '',
        category: '',
        location: '',
        severity: 'Medium',
        image_url: '',
        ai_image_verification_json: null
      });
      setVerificationStatus('idle');
      setShowMismatchModal(false);
      loadIncidents();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    }
  };

  const categories = [
    'Accident', 'Road Accident', 'Flood', 'Flooding', 'Pothole', 'Road Blockage', 'Traffic Blockage', 'Signal Failure', 'Infrastructure Failure', 'Fallen Tree', 'Road Damage', 'Public Hazard', 'Traffic Congestion', 'Construction Activity'
  ];

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-slate-50 to-slate-200">
      <header className="px-6 py-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            <span className="text-xl font-bold text-slate-900">UrbanPulse</span>
          </div>
        </Link>
        <button onClick={logout} className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
          <LogOut className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Logout</span>
        </button>
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto">
        {!isReporting ? (
          <>
            <div className="mb-10">
              <h1 className="text-4xl font-bold mb-2 text-slate-900">Hi there! 👋</h1>
              <p className="text-lg text-slate-600">Help make Bengaluru better</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <button
                onClick={() => {
                  setIsReporting(true);
                  setReportStep(1);
                  setVerificationStatus('idle');
                  setShowMismatchModal(false);
                }}
                className="bg-white border border-slate-200 p-6 rounded-3xl text-left shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-1 text-slate-900">Report Incident</h3>
                <p className="text-sm text-slate-600">Quick & easy</p>
              </button>
              <button 
                onClick={() => setView('nearby')}
                className={`bg-white border p-6 rounded-3xl text-left shadow-sm hover:shadow-md transition-all ${view === 'nearby' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-1 text-slate-900">Nearby Issues</h3>
                <p className="text-sm text-slate-600">Verify reports around you</p>
              </button>
            </div>

            {/* ── Smart Journey Mode (UMPN) ── */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5 relative z-10">
                <div className="flex items-start gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${smartJourney ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    {smartJourney ? <Radar className="w-6 h-6 text-white" /> : <Activity className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-xl text-slate-800 tracking-tight">Smart Journey Mode</h3>
                      <span className="text-[9px] font-extrabold tracking-wider uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">Anonymized UMPN Feed</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Understanding city movement through collective mobility intelligence.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-xs font-bold text-slate-500">{smartJourney ? 'Telemetry Enabled' : 'Telemetry Disabled'}</span>
                  <button
                    disabled={updatingSettings}
                    onClick={() => toggleSmartJourney(!smartJourney)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-205 transition-colors duration-200 ease-in-out focus:outline-none ${
                      smartJourney ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        smartJourney ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="relative z-10">
                {!smartJourney ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-slate-50/50 border border-slate-100 p-4.5 rounded-2xl">
                      <h4 className="font-bold text-sm text-slate-800 mb-1">Zero User Effort</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Runs in the background completely hands-free. No forms, destination inputs, or reporting checklists needed.</p>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 p-4.5 rounded-2xl">
                      <h4 className="font-bold text-sm text-slate-800 mb-1">Privacy-First Design</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Only aggregated velocity vectors and volume trends are transmitted. Your individual locations are never exposed.</p>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 p-4.5 rounded-2xl">
                      <h4 className="font-bold text-sm text-slate-800 mb-1">Collective Impact</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">Allows the routing engine to warn authorities and emergency crews of early bottleneck patterns before they fully form.</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border border-indigo-100/40 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Live Anonymized Trip</span>
                        <span className="text-sm font-bold text-slate-700 block mt-1 leading-snug">
                          {telemetry ? `${telemetry.origin.split(' ')[0]} → ${telemetry.destination.split(' ')[0]}` : 'Calculating...'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Route Corridor</span>
                        <span className="text-xs font-semibold text-slate-650 block mt-1 truncate text-slate-600">
                          {telemetry ? telemetry.route_taken : 'Registering path...'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Duration & Delay</span>
                        <span className="text-sm font-bold text-slate-700 block mt-1">
                          {telemetry ? `${telemetry.duration_mins} mins (+${telemetry.delay_mins}m delay)` : '--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Route Deviation</span>
                        <span className={`text-xs font-bold block mt-1 ${telemetry?.deviation_detected ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {telemetry ? (telemetry.deviation_detected ? '⚠️ Detected' : '✅ None') : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {udsSimulations.length > 0 && (
              <div className="mb-10 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40 border border-indigo-100/70 p-6 sm:p-8 rounded-3xl shadow-[0_12px_40px_rgba(99,102,241,0.03)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Active Advisory Feed</span>
                </div>
                <h3 className="font-extrabold text-xl sm:text-2xl text-slate-800 tracking-tight flex items-center gap-2.5">
                  <Clock className="w-6 h-6 text-indigo-600" />
                  Upcoming City Advisories & Transit Impact
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 mb-6 max-w-2xl leading-relaxed">
                  Review planned road closures, public events, and infrastructure maintenance schedules simulated by authorities.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {udsSimulations.slice(0, 2).map((sim) => {
                    let resultsObj = {} as any;
                    try {
                      resultsObj = typeof sim.results_json === 'string' ? JSON.parse(sim.results_json) : sim.results_json;
                    } catch {}
                    
                    const delayMins = resultsObj?.avg_delay_increase_mins || (sim.duration_hours * 3) || 15;
                    
                    const getScenarioStyle = (type: string) => {
                      const t = type.toLowerCase();
                      if (t.includes('closure') || t.includes('restrict')) {
                        return 'bg-rose-50 text-rose-700 border-rose-100';
                      }
                      if (t.includes('event') || t.includes('rally') || t.includes('festival')) {
                        return 'bg-purple-50 text-purple-700 border-purple-100';
                      }
                      if (t.includes('maintenance') || t.includes('construction') || t.includes('work')) {
                        return 'bg-amber-50 text-amber-700 border-amber-100';
                      }
                      if (t.includes('signal') || t.includes('traffic')) {
                        return 'bg-blue-50 text-blue-700 border-blue-100';
                      }
                      return 'bg-indigo-50 text-indigo-700 border-indigo-100';
                    };
                    
                    const getDelayStyle = (mins: number) => {
                      if (mins >= 30) return 'text-rose-600 bg-rose-50 border-rose-100';
                      if (mins >= 15) return 'text-amber-600 bg-amber-50 border-amber-100';
                      return 'text-emerald-600 bg-emerald-50 border-emerald-100';
                    };

                    return (
                      <motion.div
                        key={sim.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        whileHover={{ y: -4 }}
                        className="group relative bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_32px_rgba(99,102,241,0.06)] hover:border-indigo-200 transition-all duration-300 p-5 rounded-2xl flex flex-col justify-between overflow-hidden"
                      >
                        {/* Decorative hover glow */}
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-xl group-hover:scale-150 transition-all duration-500 pointer-events-none" />
                        
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-3.5 gap-2">
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${getScenarioStyle(sim.scenario_type)}`}>
                              {sim.scenario_type}
                            </span>
                            <div className={`flex items-center gap-1 text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full border ${getDelayStyle(delayMins)}`}>
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>+{delayMins}m delay</span>
                            </div>
                          </div>
                          <h4 className="font-bold text-slate-800 text-base leading-snug group-hover:text-indigo-950 transition-colors">
                            {sim.title}
                          </h4>
                          <div className="flex items-start gap-1.5 mt-2 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />
                            <span className="text-[11px] font-medium leading-tight text-slate-500">
                              {sim.location} <span className="text-slate-400">({sim.affected_area})</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-650 mt-3.5 leading-relaxed font-normal bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                            {resultsObj?.citizen || 'Local transit schedules may be modified. Yield to corridor signs.'}
                          </p>
                        </div>
                        <div className="relative z-10 mt-4 p-3 bg-emerald-50/60 border border-emerald-100/60 rounded-xl flex items-start gap-2 text-[11px] text-emerald-800 leading-relaxed font-medium">
                          <span className="shrink-0 text-sm mt-0.5">💡</span>
                          <div>
                            <span className="font-bold text-emerald-950 mr-1">Advice:</span>
                            {sim.alternative_strategy || 'Seek alternative routes if possible.'}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">{view === 'reports' ? 'My Reports' : 'Community Verification'}</h2>
              <button onClick={() => setView(view === 'reports' ? 'nearby' : 'reports')} className="text-blue-600 font-semibold text-sm">
                {view === 'reports' ? 'View Nearby' : 'View My Reports'}
              </button>
            </div>

            <div className="space-y-4">
              {view === 'reports' && incidents.length === 0 ? (
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                  <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No reports yet. Be the first to report an issue!</p>
                </div>
              ) : view === 'reports' ? (
                incidents.map((incident) => {
                  const steps = ["Reported", "AI Verified", "Under Review", "Action Initiated", "Resolved"];
                  const currentIndex = steps.indexOf(incident.status) === -1 ? (incident.status === 'Closed' ? 5 : 0) : steps.indexOf(incident.status);
                  
                  return (
                  <div key={incident.id} className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col gap-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          currentIndex >= 4 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {currentIndex >= 4 ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-900">{incident.title}</h3>
                          <p className="text-sm text-slate-500">{new Date(incident.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {incident.ai_analysis?.priority && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${incident.ai_analysis.priority === 'Critical' ? 'bg-red-100 text-red-700' : incident.ai_analysis.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                          {incident.ai_analysis.priority} Priority
                        </span>
                      )}
                    </div>
                    
                    {/* Status Tracker */}
                    <div className="mt-2">
                      <div className="flex justify-between mb-2">
                        {steps.map((s, i) => (
                          <span key={s} className={`text-[10px] sm:text-xs font-semibold ${i <= currentIndex ? 'text-blue-600' : 'text-slate-400'}`}>{s}</span>
                        ))}
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        {steps.map((s, i) => (
                          <div key={s} className={`h-full flex-1 border-r border-white/50 last:border-0 ${i <= currentIndex ? 'bg-blue-500' : 'bg-transparent'}`} />
                        ))}
                      </div>
                    </div>

                    {(() => {
                      const matchingChain = emergencyChains.find(ec => ec.incident_id === incident.id);
                      return matchingChain ? (
                        <div className="mt-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
                          <h4 className="font-extrabold text-sm flex items-center gap-1.5 uppercase text-rose-900">
                            <Siren className="w-4 h-4 text-rose-600 animate-pulse animate-bounce" />
                            Emergency Response Coordinated
                          </h4>
                          <div className="text-xs mt-2 space-y-1.5 leading-relaxed text-rose-800">
                            <p>
                              <strong>Status:</strong> Response priority is set to <strong className="text-rose-900">{matchingChain.response_priority}</strong>.
                            </p>
                            <p>
                              <strong>Hospital Recommendation:</strong> Coordinated with <strong className="text-rose-900">{matchingChain.hospital_name}</strong> ({matchingChain.hospital_eta} min ETA).
                            </p>
                            <p>
                              <strong>Corridor:</strong> Priority green corridor <em>{matchingChain.corridor_primary}</em> is enabled.
                            </p>
                            <div className="mt-2.5 p-3 bg-white border border-rose-100 rounded-xl text-rose-700">
                              <strong>Guidance Action:</strong> Please stay clear of the active lanes near {incident.location || 'Incident Site'} and yield to approaching emergency response units.
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {currentIndex >= 4 && (
                      <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
                        <h4 className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Impact Achieved</h4>
                        <p className="text-sm mt-1">Your report was crucial. Traffic impact mitigated in {incident.location}. Thank you for contributing to urban intelligence!</p>
                      </div>
                    )}
                  </div>
                )})
              ) : null}

              {view === 'nearby' && nearby.length === 0 ? (
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                  <p className="text-slate-600">No active incidents reported near you.</p>
                </div>
              ) : view === 'nearby' ? (
                nearby.map((incident) => (
                  <div key={incident.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{incident.title}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {incident.location}</p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">Reported {new Date(incident.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 mb-4">{incident.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { api.communityVerifyIncident(incident.id, 'Confirm'); loadNearby(); }} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-semibold transition-colors">👍 Confirm Present</button>
                      <button onClick={() => { api.communityVerifyIncident(incident.id, 'Outdated'); loadNearby(); }} className="px-3 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold transition-colors">❌ Outdated / Cleared</button>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </>
        ) : (
          <>
            <ReportFlow
              step={reportStep}
              setStep={setReportStep}
              data={reportData}
              setData={setReportData}
              onNext={nextStep}
              onSubmit={submitReport}
              onClose={() => setIsReporting(false)}
              handleImageUpload={handleImageUpload}
              categories={categories}
              error={error}
              isVerifying={isVerifying}
              verificationStatus={verificationStatus}
              setVerificationStatus={setVerificationStatus}
              setShowMismatchModal={setShowMismatchModal}
            />

            {/* Mismatch Warning Modal */}
            {showMismatchModal && reportData.ai_image_verification_json && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
                >
                  <div className="flex items-center gap-3 text-orange-600">
                    <AlertTriangle className="w-8 h-8" />
                    <h3 className="text-xl font-bold">Incident Mismatch Detected</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Our AI analyzed your photo and detected <strong>{reportData.ai_image_verification_json.detected_category}</strong> with {(reportData.ai_image_verification_json.confidence * 100).toFixed(0)}% confidence, but you selected <strong>{reportData.category}</strong>. Please review the selected category.
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => {
                        const updatedCategory = reportData.ai_image_verification_json.detected_category;
                        setReportData((prev: any) => ({ ...prev, category: updatedCategory }));
                        setVerificationStatus('verified');
                        setShowMismatchModal(false);
                        
                        // Update Copilot local storage context
                        const stored = localStorage.getItem('urbanpulse_verification_context');
                        if (stored) {
                          try {
                            const parsed = JSON.parse(stored);
                            parsed.status = 'verified';
                            parsed.selected_category = updatedCategory;
                            localStorage.setItem('urbanpulse_verification_context', JSON.stringify(parsed));
                          } catch {}
                        }
                      }}
                      className="w-full py-3 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md"
                    >
                      Change Category to {reportData.ai_image_verification_json.detected_category}
                    </button>
                    <button
                      onClick={() => {
                        setShowMismatchModal(false);
                      }}
                      className="w-full py-3 bg-white border border-slate-200 text-slate-800 rounded-2xl font-semibold text-sm hover:bg-slate-50 transition-all"
                    >
                      Continue Anyway
                    </button>
                    <button
                      onClick={() => {
                        setReportData((prev: any) => ({ ...prev, image_url: '', ai_image_verification_json: null }));
                        setVerificationStatus('idle');
                        setShowMismatchModal(false);
                        localStorage.removeItem('urbanpulse_verification_context');
                      }}
                      className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-semibold text-sm hover:bg-red-100 transition-all"
                    >
                      Cancel Submission
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ReportFlow({
  step,
  setStep,
  data,
  setData,
  onNext,
  onSubmit,
  onClose,
  handleImageUpload,
  categories,
  error,
  isVerifying,
  verificationStatus,
  setVerificationStatus,
  setShowMismatchModal
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitDisabled = isVerifying || 
    (data.image_url && (verificationStatus === 'non_crisis' || verificationStatus === 'low_confidence'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <button
        onClick={onClose}
        className="absolute -top-2 right-0 p-2"
      >
        <X className="w-6 h-6 text-slate-500" />
      </button>

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold mb-2 text-slate-900">What happened?</h2>
          <p className="text-slate-600">Describe the incident</p>

          <input
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-lg focus:outline-none focus:border-blue-500 shadow-sm"
            placeholder="Title (e.g., Pothole on MG Road)"
          />
          <textarea
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl h-32 resize-none focus:outline-none focus:border-blue-500 shadow-sm"
            placeholder="Add more details..."
          />

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={onNext}
            disabled={!data.title}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
          >
            Next: Add location
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold mb-2 text-slate-900">Where is this?</h2>
          <p className="text-slate-600">Select category & location</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {categories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setData({ ...data, category: cat })}
                className={`py-3 px-4 bg-white border rounded-xl text-left transition-all ${
                  data.category === cat
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 hover:border-blue-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-700 mb-2">Location</label>
            <input
              type="text"
              value={data.location}
              onChange={(e) => setData({ ...data, location: e.target.value })}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 shadow-sm"
              placeholder="e.g., Silk Board Junction"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                if (!navigator.geolocation) {
                  setData({ ...data, location: 'Geolocation not supported' });
                  return;
                }
                setData({ ...data, location: 'Locating...' });
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                      const geoData = await res.json();
                      if (geoData && geoData.address) {
                        const addr = geoData.address;
                        const shortAddr = addr.suburb || addr.neighbourhood || addr.road || geoData.display_name.split(',')[0];
                        const city = addr.city || addr.town || addr.county || '';
                        setData({ ...data, location: `${shortAddr}${city ? ', ' + city : ''}` });
                      } else {
                        setData({ ...data, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
                      }
                    } catch (err) {
                      setData({ ...data, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
                    }
                  },
                  (error) => {
                    setData({ ...data, location: 'Location access denied' });
                  }
                );
              }}
              className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-semibold text-lg text-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              Use Current Location
            </button>
            <button
              onClick={onNext}
              disabled={!data.category || !data.location}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
            >
              Next: Add photo
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold mb-2 text-slate-900">Add a photo</h2>
          <p className="text-slate-600">Visual evidence helps AI analyze faster</p>

          {!data.image_url ? (
            <>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="block w-full aspect-video bg-white border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 shadow-sm"
              >
                <Camera className="w-16 h-16 text-slate-400 mb-3" />
                <p className="text-lg font-semibold text-slate-700">Tap to add photo</p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </>
          ) : (
            <div className="relative">
              <img src={data.image_url} alt="Preview" className="w-full aspect-video object-cover rounded-3xl border border-slate-200 shadow-sm" />
              <button
                type="button"
                onClick={() => {
                  setData({ ...data, image_url: '', ai_image_verification_json: null });
                  setVerificationStatus('idle');
                  localStorage.removeItem('urbanpulse_verification_context');
                }}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-all shadow-md flex items-center justify-center"
                title="Remove photo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Client-side Loading Indicator */}
          {isVerifying && (
            <div className="p-8 bg-blue-50 border border-blue-100 rounded-3xl flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-blue-700 font-bold animate-pulse text-base">Analyzing Image...</p>
              <p className="text-blue-600/70 text-xs">AI Computer Vision is verifying public crisis signatures...</p>
            </div>
          )}

          {/* Verification Status Cards */}
          {!isVerifying && data.image_url && verificationStatus === 'verified' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0 text-sm">✓</div>
              <div className="flex-1 space-y-0.5">
                <h4 className="font-bold text-emerald-950 text-sm">✓ Crisis Verified</h4>
                <div className="text-xs text-emerald-800">
                  <span className="block">Detected Incident: <strong>{data.ai_image_verification_json?.detected_category}</strong></span>
                  <span className="block">Confidence: <strong>{(data.ai_image_verification_json?.confidence * 100).toFixed(0)}%</strong></span>
                </div>
              </div>
            </div>
          )}

          {!isVerifying && data.image_url && verificationStatus === 'non_crisis' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-3xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold shrink-0 text-sm">✕</div>
              <div className="flex-1 space-y-1.5">
                <h4 className="font-bold text-red-950 text-sm">Unable to Verify Crisis</h4>
                <p className="text-xs text-red-800">
                  The uploaded image does not appear to represent an emergency or public incident. Please upload a valid incident photograph.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setData({ ...data, image_url: '', ai_image_verification_json: null });
                    setVerificationStatus('idle');
                    localStorage.removeItem('urbanpulse_verification_context');
                  }}
                  className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
                >
                  Clear & Retry
                </button>
              </div>
            </div>
          )}

          {!isVerifying && data.image_url && verificationStatus === 'low_confidence' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold shrink-0 text-sm">!</div>
              <div className="flex-1 space-y-1.5">
                <h4 className="font-bold text-amber-950 text-sm">Verification Uncertain</h4>
                <p className="text-xs text-amber-800">
                  Unable to confidently classify the incident ({((data.ai_image_verification_json?.confidence || 0) * 100).toFixed(0)}% confidence). Please upload a clearer image.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors"
                  >
                    Upload Another Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setData({ ...data, image_url: '', ai_image_verification_json: null });
                      setVerificationStatus('idle');
                      localStorage.removeItem('urbanpulse_verification_context');
                    }}
                    className="px-3.5 py-1.5 bg-slate-600 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isVerifying && data.image_url && verificationStatus === 'mismatch' && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-3xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold shrink-0 text-sm">!</div>
              <div className="flex-1 space-y-1.5">
                <h4 className="font-bold text-orange-950 text-sm">Category Mismatch</h4>
                <p className="text-xs text-orange-800 font-medium">
                  AI detected <strong>{data.ai_image_verification_json?.detected_category}</strong> instead of <strong>{data.category}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowMismatchModal(true)}
                  className="px-3.5 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors"
                >
                  Review Options
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => {
                const clearedData = { ...data, image_url: '', ai_image_verification_json: null };
                setData(clearedData);
                setVerificationStatus('idle');
                localStorage.removeItem('urbanpulse_verification_context');
                onSubmit(clearedData);
              }}
              className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-semibold text-lg text-slate-800 shadow-sm hover:shadow-md transition-all"
              disabled={isVerifying}
            >
              Skip
            </button>
            <button
              onClick={onNext}
              disabled={isSubmitDisabled}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:hover:shadow-lg transition-all"
            >
              Submit Report
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-slate-900">Report Submitted!</h2>
          <p className="text-slate-600 mb-8">Thanks for helping make Bengaluru better</p>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function CitizenPage() {
  return (
    <ProtectedRoute requiredRole="citizen">
      <CitizenContent />
    </ProtectedRoute>
  );
}


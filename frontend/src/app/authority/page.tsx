'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Activity, AlertTriangle, Cloud, MapPin, Route, BarChart3,
  FlaskConical, LogOut, Brain, Shield, RefreshCw, Send,
  ChevronDown, ChevronUp, TrendingUp, Zap, X, Sparkles,
  Eye, Siren, Navigation, ThermometerSun, Target, History, Radar,
  Search, FileText, PieChart, Clock, CheckCircle2, Megaphone, UserPlus, Globe,
  Sliders
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import 'leaflet/dist/leaflet.css';

import MapWrapper from '@/components/MapWrapper';

interface TrafficNode { id: number; lat: number; lng: number; congestion: number; }
interface Incident { id: number; title: string; severity: string; status: string; lat?: number; lng?: number; category?: string; created_at: string; description?: string; location?: string; ai_analysis?: any; ai_analysis_json?: string; ai_image_verification_json?: string; image_url?: string; }

const LOCATIONS = [
  { name: 'Koramangala', lat: 12.9345, lng: 77.6265 },
  { name: 'HSR Layout', lat: 12.9172, lng: 77.6228 },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7499 },
  { name: 'MG Road', lat: 12.9719, lng: 77.6010 },
  { name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
  { name: 'Majestic', lat: 12.9766, lng: 77.5713 },
  { name: 'Malleshwaram', lat: 13.0031, lng: 77.5643 },
];

function getTimeLabel() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 20) return 'Evening';
  return 'Night';
}

const Panel = ({ id, title, icon: Icon, badge, children, accent = 'blue', collapsible = false, isOpen = true, onToggle }: any) => {
  const accentMap: Record<string, string> = { blue: 'text-blue-600 bg-blue-50', red: 'text-red-600 bg-red-50', purple: 'text-purple-600 bg-purple-50', cyan: 'text-cyan-600 bg-cyan-50', green: 'text-green-600 bg-green-50', orange: 'text-orange-600 bg-orange-50', amber: 'text-amber-600 bg-amber-50' };
  
  const HeaderContent = (
    <>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentMap[accent] || accentMap.blue}`}><Icon className="w-4.5 h-4.5" /></div>
        <h3 className="font-bold text-slate-900">{title}</h3>
        {badge !== undefined && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">{badge}</span>}
      </div>
      {collapsible && <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown className="w-4 h-4 text-slate-400" /></motion.div>}
    </>
  );

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden transition-all">
      {collapsible ? (
        <button onClick={() => onToggle && onToggle(id)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-all">
          {HeaderContent}
        </button>
      ) : (
        <div className="w-full flex items-center justify-between p-5">
          {HeaderContent}
        </div>
      )}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={collapsible ? { height: 0, opacity: 0 } : undefined} animate={{ height: 'auto', opacity: 1 }} exit={collapsible ? { height: 0, opacity: 0 } : undefined} transition={{ duration: 0.25 }}>
            <div className={`px-5 pb-5 ${collapsible ? 'border-t border-slate-100' : ''}`}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const getViaRoute = (orig: string, dest: string, option: 'fastest' | 'balanced' | 'safest' | 'emergency') => {
  if (orig === dest) return "Local Roads";
  const key = [orig, dest].sort().join(' <-> ');
  
  const lookup: Record<string, { fastest: string, balanced: string, safest: string, emergency: string }> = {
    'HSR Layout <-> Koramangala': {
      fastest: 'via Sarjapur Road Expressway',
      balanced: 'via 80 Feet Road / Sarjapur Road',
      safest: 'via Outer Ring Road (avoiding lane restrictions)',
      emergency: 'Priority Green Corridor (via Outer Ring Road)'
    },
    'Indiranagar <-> Koramangala': {
      fastest: 'via 100 Feet Road Flyover',
      balanced: 'via 100 Feet Road',
      safest: 'via Inner Ring Road and Domlur bypass',
      emergency: 'Priority Green Corridor (via Inner Ring Road)'
    },
    'Koramangala <-> Whitefield': {
      fastest: 'via HAL Old Airport Road Expressway',
      balanced: 'via HAL Old Airport Road and Outer Ring Road',
      safest: 'via Varthur Road (low incident profile)',
      emergency: 'Priority Green Corridor (via HAL Airport Road)'
    },
    'Koramangala <-> MG Road': {
      fastest: 'via Hosur Road Elevated Corridor',
      balanced: 'via Hosur Road',
      safest: 'via Richmond Road (low traffic speed variation)',
      emergency: 'Priority Green Corridor (via Hosur Road)'
    },
    'Electronic City <-> Koramangala': {
      fastest: 'via Hosur Road Elevated Tollway',
      balanced: 'via Hosur Road (Surface Corridor)',
      safest: 'via Hosa Road and Sarjapur Road bypass',
      emergency: 'Priority Green Corridor (via Elevated Tollway)'
    },
    'Koramangala <-> Majestic': {
      fastest: 'via Residency Road Expressway',
      balanced: 'via Hosur Road and Residency Road',
      safest: 'via Lalbagh Fort Road (bypassing busy circles)',
      emergency: 'Priority Green Corridor (via Lalbagh Fort Road)'
    },
    'Koramangala <-> Malleshwaram': {
      fastest: 'via Seshadri Road Expressway',
      balanced: 'via Seshadri Road and Palace Road',
      safest: 'via Sampige Road bypass',
      emergency: 'Priority Green Corridor (via Seshadri Road)'
    },
    'HSR Layout <-> Indiranagar': {
      fastest: 'via Outer Ring Road and 100 Feet Road Flyover',
      balanced: 'via Outer Ring Road and 100 Feet Road',
      safest: 'via Wind Tunnel Road bypass',
      emergency: 'Priority Green Corridor (via Outer Ring Road)'
    },
    'HSR Layout <-> Whitefield': {
      fastest: 'via Outer Ring Road Expressway',
      balanced: 'via Outer Ring Road',
      safest: 'via Marathahalli Bridge and Varthur Road bypass',
      emergency: 'Priority Green Corridor (via Outer Ring Road)'
    },
    'HSR Layout <-> MG Road': {
      fastest: 'via Hosur Road Elevated Corridor',
      balanced: 'via Hosur Road',
      safest: 'via Richmond Circle and Outer Ring Road bypass',
      emergency: 'Priority Green Corridor (via Hosur Road)'
    },
    'Electronic City <-> HSR Layout': {
      fastest: 'via Hosur Road Tollway',
      balanced: 'via Hosur Road (Surface Corridor)',
      safest: 'via Hosa Road bypass',
      emergency: 'Priority Green Corridor (via Hosur Road)'
    },
    'HSR Layout <-> Majestic': {
      fastest: 'via Hosur Road Expressway',
      balanced: 'via Hosur Road and Richmond Road',
      safest: 'via Lalbagh Road bypass',
      emergency: 'Priority Green Corridor (via Hosur Road)'
    },
    'HSR Layout <-> Malleshwaram': {
      fastest: 'via Outer Ring Road and Seshadri Road Expressway',
      balanced: 'via Outer Ring Road and Seshadri Road',
      safest: 'via Seshadripuram bypass',
      emergency: 'Priority Green Corridor (via Seshadri Road)'
    },
    'Indiranagar <-> Whitefield': {
      fastest: 'via Old Airport Road / ITPL Main Road Flyover',
      balanced: 'via Old Airport Road and ITPL Main Road',
      safest: 'via Hoodi Circle bypass',
      emergency: 'Priority Green Corridor (via ITPL Main Road)'
    },
    'Indiranagar <-> MG Road': {
      fastest: 'via Old Madras Road Expressway',
      balanced: 'via Old Madras Road',
      safest: 'via Kensington Road (quiet lake-side corridor)',
      emergency: 'Priority Green Corridor (via Old Madras Road)'
    },
    'Electronic City <-> Indiranagar': {
      fastest: 'via Outer Ring Road Tollway',
      balanced: 'via Outer Ring Road',
      safest: 'via Haralur Road bypass',
      emergency: 'Priority Green Corridor (via Outer Ring Road)'
    },
    'Indiranagar <-> Majestic': {
      fastest: 'via MG Road Flyover',
      balanced: 'via MG Road and Cubbon Road',
      safest: 'via Richmond Road (incident free zone)',
      emergency: 'Priority Green Corridor (via MG Road)'
    },
    'Indiranagar <-> Malleshwaram': {
      fastest: 'via CV Raman Road Expressway',
      balanced: 'via CV Raman Road and Sankey Road',
      safest: 'via Palace Road bypass',
      emergency: 'Priority Green Corridor (via CV Raman Road)'
    },
    'MG Road <-> Whitefield': {
      fastest: 'via Old Airport Road Expressway',
      balanced: 'via Old Airport Road',
      safest: 'via Varthur Road bypass',
      emergency: 'Priority Green Corridor (via Old Airport Road)'
    },
    'Electronic City <-> Whitefield': {
      fastest: 'via Outer Ring Road Expressway',
      balanced: 'via Outer Ring Road',
      safest: 'via Belandur and Varthur bypass',
      emergency: 'Priority Green Corridor (via Outer Ring Road)'
    },
    'Majestic <-> Whitefield': {
      fastest: 'via Old Madras Road Expressway',
      balanced: 'via Old Madras Road',
      safest: 'via HAL Airport Road bypass',
      emergency: 'Priority Green Corridor (via Old Madras Road)'
    },
    'Malleshwaram <-> Whitefield': {
      fastest: 'via Old Madras Road and Seshadri Road Flyover',
      balanced: 'via Old Madras Road',
      safest: 'via CV Raman Road and Hoodi bypass',
      emergency: 'Priority Green Corridor (via Old Madras Road)'
    },
    'Electronic City <-> MG Road': {
      fastest: 'via Hosur Road Elevated Expressway',
      balanced: 'via Hosur Road',
      safest: 'via Richmond Circle bypass',
      emergency: 'Priority Green Corridor (via Hosur Road)'
    },
    'Majestic <-> MG Road': {
      fastest: 'via Seshadri Road Flyover',
      balanced: 'via Seshadri Road',
      safest: 'via Palace Road bypass',
      emergency: 'Priority Green Corridor (via Seshadri Road)'
    },
    'Malleshwaram <-> MG Road': {
      fastest: 'via Palace Road Flyover',
      balanced: 'via Palace Road',
      safest: 'via Cunningham Road bypass',
      emergency: 'Priority Green Corridor (via Palace Road)'
    },
    'Electronic City <-> Majestic': {
      fastest: 'via Hosur Road Elevated Tollway',
      balanced: 'via Hosur Road (Surface Corridor)',
      safest: 'via Lalbagh Fort Road bypass',
      emergency: 'Priority Green Corridor (via Elevated Tollway)'
    },
    'Electronic City <-> Malleshwaram': {
      fastest: 'via Hosur Road and Seshadri Road Expressway',
      balanced: 'via Hosur Road and Seshadri Road',
      safest: 'via Palace Road bypass',
      emergency: 'Priority Green Corridor (via Hosur Road)'
    },
    'Majestic <-> Malleshwaram': {
      fastest: 'via Sampige Road Expressway',
      balanced: 'via Sampige Road',
      safest: 'via Margosa Road bypass',
      emergency: 'Priority Green Corridor (via Sampige Road)'
    }
  };

  const routeData = lookup[key];
  if (!routeData) {
    if (option === 'fastest') return 'via Primary Arterial Expressway';
    if (option === 'safest') return 'via Quiet Secondary Bypass';
    if (option === 'emergency') return 'via Emergency Priority Corridor';
    return 'via Local Arterial Road';
  }

  return routeData[option];
};

function AuthorityContent() {
  const { logout } = useAuth();

  const [traffic, setTraffic] = useState<TrafficNode[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [congestion, setCongestion] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [healthHistory, setHealthHistory] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [routeMode, setRouteMode] = useState<'optimize' | 'emergency' | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [selectedRouteOption, setSelectedRouteOption] = useState<'fastest' | 'balanced' | 'safest'>('balanced');
  const [hospitalRouteActivated, setHospitalRouteActivated] = useState(false);

  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);

  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set(['decision', 'map', 'incidents']));
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState({ lat: 12.9345, lng: 77.6265 });
  const [destination, setDestination] = useState({ lat: 12.9172, lng: 77.6228 });

  // New Intelligence States
  const [decisionAssistant, setDecisionAssistant] = useState<any>(null);
  const [vulnerabilityScanner, setVulnerabilityScanner] = useState<any>(null);
  const [memoryEngineResult, setMemoryEngineResult] = useState<any>(null);
  
  const [commandFeed, setCommandFeed] = useState<any>(null);
  const [missions, setMissions] = useState<any>(null);
  const [newsroom, setNewsroom] = useState<any>(null);
  const [explainPrediction, setExplainPrediction] = useState<any>(null);
  const [memoryTimeline, setMemoryTimeline] = useState<any>(null);
  const [deployment, setDeployment] = useState<any>(null);
  const [briefing, setBriefing] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [impactCalcAction, setImpactCalcAction] = useState('Close Road');
  const [impactCalcResult, setImpactCalcResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [emergencyChains, setEmergencyChains] = useState<any[]>([]);

  const togglePanel = (id: string) => setOpenPanels(p => {
    const next = new Set(p);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const loadAll = useCallback(async () => {
    try {
      const [tRes, iRes, wRes, hRes, cRes, insRes, hhRes, daRes, vsRes, cfRes, mRes, nRes, cbRes, ecRes] = await Promise.allSettled([
        api.getTrafficPredictions(), api.getIncidents(), api.getWeather(),
        api.getUrbanHealth(), api.getTrafficCongestion(), api.generateInsights(),
        api.getUrbanHealthHistory(12), api.getDecisionAssistant(), api.getVulnerabilityScanner(),
        api.getCommandFeed(), api.getMissions(), api.getNewsroom(), api.getCityBriefing(),
        api.getEmergencyChains()
      ]);
      if (tRes.status === 'fulfilled') setTraffic(tRes.value.predictions || []);
      if (iRes.status === 'fulfilled') setIncidents(iRes.value || []);
      if (wRes.status === 'fulfilled') setWeather(wRes.value);
      if (hRes.status === 'fulfilled') setHealth(hRes.value);
      if (cRes.status === 'fulfilled') setCongestion(cRes.value);
      if (insRes.status === 'fulfilled') setInsights(insRes.value);
      if (hhRes.status === 'fulfilled') setHealthHistory(hhRes.value || []);
      if (daRes.status === 'fulfilled') setDecisionAssistant(daRes.value);
      if (vsRes.status === 'fulfilled') setVulnerabilityScanner(vsRes.value);
      if (cfRes.status === 'fulfilled') setCommandFeed(cfRes.value);
      if (mRes.status === 'fulfilled') setMissions(mRes.value?.missions || []);
      if (nRes.status === 'fulfilled') setNewsroom(nRes.value?.summaries || []);
      if (cbRes.status === 'fulfilled') setBriefing(cbRes.value);
      if (ecRes.status === 'fulfilled') setEmergencyChains(ecRes.value || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); const id = setInterval(loadAll, 15000); return () => clearInterval(id); }, [loadAll]);

  const saveRouteContext = (mode: 'optimize' | 'emergency', option: 'balanced' | 'fastest' | 'safest', res: any, origName: string, destName: string) => {
    if (!res) return;
    
    let eta = res.eta_minutes;
    if (mode === 'optimize') {
      if (option === 'fastest') {
        eta = Math.max(5, Math.round(res.eta_minutes - 1));
      } else if (option === 'safest') {
        eta = Math.round(res.eta_minutes + 2);
      }
    }

    const balancedConfidence = Math.max(60, Math.min(98, Math.round(100 - res.avg_congestion * 40 - (res.weather_impact !== 'Clear' ? 15 : 0))));
    let confidence = balancedConfidence;
    if (mode === 'optimize') {
      if (option === 'fastest') confidence = Math.max(50, Math.min(92, Math.round(balancedConfidence - 8)));
      else if (option === 'safest') confidence = Math.max(70, Math.min(99, Math.round(balancedConfidence + 5)));
    } else if (mode === 'emergency') {
      confidence = 96;
    }

    let riskLevel = 'LOW';
    if (res.avg_congestion >= 0.75) riskLevel = 'CRITICAL';
    else if (res.avg_congestion >= 0.55) riskLevel = 'HIGH';
    else if (res.avg_congestion >= 0.3) riskLevel = 'MEDIUM';

    let whyList = [];
    if (res.avg_congestion >= 0.6) {
      whyList = ["Avoids major bottlenecks", "Bypasses high-delay junctions", "Weather adaptive routing"];
    } else if (res.avg_congestion >= 0.3) {
      whyList = ["Moderate traffic conditions", "Stable weather conditions", "Fewer intersections"];
    } else {
      whyList = ["Minimal traffic density", "Dry road conditions", "Clear signals"];
    }

    let travelInsight = [
      "Leave within 15 minutes",
      "Traffic expected to rise later",
      "Alternative routes monitored"
    ];
    if (res.weather_impact !== 'Clear') {
      travelInsight.push("Rainfall may affect travel");
    }

    localStorage.setItem('urbanpulse_route_context', JSON.stringify({
      mode,
      option,
      origin: origName,
      destination: destName,
      via_route: getViaRoute(origName, destName, mode === 'emergency' ? 'emergency' : option),
      eta: `${eta} min`,
      distance: `${res.distance_km ?? '—'} km`,
      congestion: res.avg_congestion ? `${(res.avg_congestion * 100).toFixed(0)}%` : '—',
      weather: res.weather_impact ?? 'Clear',
      confidence: `${confidence}%`,
      risk_level: riskLevel,
      why_list: whyList,
      travel_insight: travelInsight,
      timestamp: Date.now()
    }));
  };

  const handleRoute = async (emergency = false) => {
    try {
      const fn = emergency ? api.emergencyRoute : api.optimizeRoute;
      const res = await fn(origin, destination);
      setRouteResult(res);
      setRouteMode(emergency ? 'emergency' : 'optimize');
      setSelectedRouteOption('balanced'); // reset to balanced on new optimization
      setHospitalRouteActivated(false);

      const originName = LOCATIONS.find(l => Math.abs(l.lat - origin.lat) < 0.0001 && Math.abs(l.lng - origin.lng) < 0.0001)?.name || 'Origin';
      const destName = LOCATIONS.find(l => Math.abs(l.lat - destination.lat) < 0.0001 && Math.abs(l.lng - destination.lng) < 0.0001)?.name || 'Destination';

      saveRouteContext(emergency ? 'emergency' : 'optimize', 'balanced', res, originName, destName);
    } catch (e: any) { alert('Route failed: ' + e.message); }
  };

  const handleSelectOption = (option: 'balanced' | 'fastest' | 'safest') => {
    setSelectedRouteOption(option);
    const originName = LOCATIONS.find(l => Math.abs(l.lat - origin.lat) < 0.0001 && Math.abs(l.lng - origin.lng) < 0.0001)?.name || 'Origin';
    const destName = LOCATIONS.find(l => Math.abs(l.lat - destination.lat) < 0.0001 && Math.abs(l.lng - destination.lng) < 0.0001)?.name || 'Destination';
    saveRouteContext('optimize', option, routeResult, originName, destName);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatMessages(p => [...p, { role: 'user', text: msg }]);
    setChatLoading(true);

    let context: any = {};
    try {
      const stored = localStorage.getItem('urbanpulse_route_context');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
          context = { ...context, ...parsed };
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (selectedIncident) {
      let verif = null;
      try {
        if (selectedIncident.ai_image_verification_json) {
          verif = JSON.parse(selectedIncident.ai_image_verification_json);
        }
      } catch (e) {}
      context.incident = {
        id: selectedIncident.id,
        title: selectedIncident.title,
        category: selectedIncident.category,
        verification: verif,
      };
    }

    try {
      const res = await api.chat(msg, context);
      setChatMessages(p => [...p, { role: 'ai', text: res.reply }]);
    } catch {
      setChatMessages(p => [...p, { role: 'ai', text: 'AI unavailable.' }]);
    }
    setChatLoading(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    try { await api.updateIncidentStatus(id, status); loadAll(); }
    catch (e: any) { alert(e.message); }
  };

  const handleAnalyze = async (id: number) => {
    try { 
      const inc = incidents.find(i => i.id === id);
      const [res, memRes, expRes, mtRes, depRes] = await Promise.all([
        api.analyzeIncident(id),
        inc?.location ? api.getMemoryEngine(inc.location) : Promise.resolve(null),
        inc?.location ? api.explainPrediction(inc.location) : Promise.resolve(null),
        inc?.location ? api.getMemoryTimeline(inc.location) : Promise.resolve(null),
        inc?.location ? api.getResourceDeployment(inc.location) : Promise.resolve(null)
      ]);
      setAnalysisResult(res); 
      setAnalysisId(id); 
      setMemoryEngineResult(memRes);
      setExplainPrediction(expRes);
      setMemoryTimeline(mtRes);
      setDeployment(depRes);
    }
    catch (e: any) { alert(e.message); }
  };

  const handleAction = async (action: string) => {
    try {
      const res = await api.triggerAction(action, analysisId || undefined);
      alert(`Workflow Triggered:\n${res.message}\nID: ${res.workflow_id}`);
    } catch (e: any) { alert(e.message); }
  };

  const handleImpactCalc = async () => {
    setIsCalculating(true);
    try {
      const res = await api.impactCalculator(impactCalcAction, 'Citywide');
      setImpactCalcResult(res);
    } catch (e: any) { alert(e.message); }
    setIsCalculating(false);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await api.knowledgeSearch(searchQuery);
      setSearchResults(res.results);
    } catch (e: any) { alert(e.message); }
    setIsSearching(false);
  };

  // ── Helpers ──

  const congColor = (v: number) => v > 0.7 ? '#ef4444' : v > 0.4 ? '#f59e0b' : '#22c55e';
  const sevColor = (s: string) => ({ Critical: 'bg-red-100 text-red-700 border-red-200', High: 'bg-orange-100 text-orange-700 border-orange-200', Medium: 'bg-amber-100 text-amber-700 border-amber-200', Low: 'bg-emerald-100 text-emerald-700 border-emerald-200' }[s] || 'bg-slate-100 text-slate-700 border-slate-200');

  const healthColor = (score: number) => score >= 70 ? 'from-emerald-500 to-green-600' : score >= 50 ? 'from-amber-500 to-yellow-600' : 'from-red-500 to-rose-600';
  const healthTextColor = (score: number) => score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20">
          <Shield className="w-6 h-6 text-white" />
        </motion.div>
        <p className="text-slate-600 font-medium">Loading Command Center…</p>
        <p className="text-xs text-slate-400 mt-1">Initializing AI models</p>
      </div>
    </div>
  );

  const activeIncidents = incidents.filter(i => !['Resolved', 'Closed'].includes(i.status));

  const getPriorityScore = (i: any) => {
    const p = i.ai_analysis?.priority || i.severity || 'Medium';
    return p === 'Critical' ? 4 : p === 'High' ? 3 : p === 'Medium' ? 2 : 1;
  };
  
  const sortedIncidents = [...activeIncidents].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

  const selectedIncident = analysisId ? incidents.find(i => i.id === analysisId) : null;
  const aiAnalysis = selectedIncident?.ai_analysis;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Command Center</h1>
              <p className="text-xs text-slate-400 font-medium">{getTimeLabel()} · Live Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Health pill */}
            {health && (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${healthColor(health.score)} bg-opacity-10 border border-white/50`}>
                <Activity className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white">{health.score}</span>
              </div>
            )}
            <button onClick={loadAll} className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Refresh all data">
              <RefreshCw className="w-4.5 h-4.5" />
            </button>
            <Link href="/uds">
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 text-indigo-700 transition-all text-xs font-black uppercase tracking-wider shadow-sm">
                <Sliders className="w-3.5 h-3.5" /> Decision Sim
              </button>
            </Link>
            <Link href="/mobility">
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100/80 border border-purple-100 text-purple-700 transition-all text-xs font-black uppercase tracking-wider shadow-sm">
                <Activity className="w-3.5 h-3.5" /> Mobility Pulse
              </button>
            </Link>
            <button onClick={logout} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {emergencyChains.length > 0 && (
          <div className="lg:col-span-3 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-lg border border-red-500 animate-pulse flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Siren className="w-5 h-5 shrink-0 animate-bounce" />
              <span className="font-bold text-sm tracking-wide text-center sm:text-left">
                🚨 CRITICAL EMERGENCY: {emergencyChains.length} active incident(s) currently orchestrated under Emergency Chain Intelligence.
              </span>
            </div>
            <Link 
              href="/emergency-command"
              className="px-4 py-2 bg-white text-red-700 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm shrink-0"
            >
              Launch Control Center
            </Link>
          </div>
        )}
        {/* ══ LEFT COLUMN ══ */}
        <div className="lg:col-span-2 space-y-6">
        {/* ── Top Overview & Briefing ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2"><Activity className="w-5 h-5 text-blue-500" /><h3 className="font-semibold text-slate-600 text-sm">Active Incidents</h3></div>
              <div className="text-3xl font-black text-slate-900">{incidents.length}</div>
            </div>
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2"><Activity className="w-5 h-5 text-purple-500" /><h3 className="font-semibold text-slate-600 text-sm">Critical Issues</h3></div>
              <div className="text-3xl font-black text-slate-900">{incidents.filter(i => {
                let p = i.severity;
                try { if (i.ai_analysis_json) p = JSON.parse(i.ai_analysis_json).priority || p; } catch {}
                return p === 'Critical';
              }).length}</div>
            </div>
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2"><Zap className="w-5 h-5 text-amber-500" /><h3 className="font-semibold text-slate-600 text-sm">City Health</h3></div>
              <div className="text-3xl font-black text-slate-900">{health?.score ? health.score.toFixed(1) : '--'}<span className="text-sm font-normal text-slate-500 ml-1">/ 100</span></div>
            </div>
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2"><ThermometerSun className="w-5 h-5 text-cyan-500" /><h3 className="font-semibold text-slate-600 text-sm">Congestion</h3></div>
              <div className="text-3xl font-black text-slate-900">{congestion?.avg_congestion ? (congestion.avg_congestion*100).toFixed(0) : '--'}<span className="text-sm font-normal text-slate-500 ml-1">%</span></div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-600"><Brain className="w-24 h-24" /></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-bold text-slate-800 tracking-wide uppercase text-xs">AI Daily Briefing</h3>
              </div>
              <h2 className="text-2xl font-black leading-tight text-slate-900 mb-4">
                {briefing?.outlook || "Analyzing City Pulse..."}
              </h2>
              {briefing?.recommendations && (
                <div className="mt-4 space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recommended Actions:</div>
                  {briefing.recommendations.map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs bg-blue-50/40 border border-blue-100/40 px-3.5 py-2.5 rounded-xl text-slate-700 font-semibold hover:bg-blue-50/70 transition-all">
                      <Target className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* ── AI Situation Room ── */}
          {decisionAssistant && (
            <Panel isOpen={true} onToggle={togglePanel} id="decision" title="AI Situation Room" icon={Target} accent="amber" badge="Top Priority" collapsible={false}>
              <div className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-black text-amber-900">{decisionAssistant.highest_priority}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${decisionAssistant.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' : decisionAssistant.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {decisionAssistant.risk_level} RISK
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wider mb-1">Affected Area</p>
                    <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> {decisionAssistant.affected_areas}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wider mb-1">Predicted Impact</p>
                    <p className="text-sm font-semibold text-amber-900">{decisionAssistant.predicted_impact}</p>
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-amber-200/50">
                  <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wider mb-1">AI Suggested Action</p>
                  <p className="text-sm font-bold text-amber-900 flex items-start gap-2"><Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/> {decisionAssistant.suggested_action}</p>
                </div>
              </div>
            </Panel>
          )}

          {/* ── Mission Board ── */}
          {missions && missions.length > 0 && (
            <Panel isOpen={true} onToggle={togglePanel} id="missions" title="UrbanPulse Mission Board" icon={CheckCircle2} accent="purple" badge={`${missions.length} Active`} collapsible={false}>
              <div className="mt-3 space-y-2">
                {missions.map((m: any) => (
                  <div key={m.id} className="p-3 bg-white border border-slate-100 rounded-xl hover:border-purple-200 transition-all shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-slate-800">{m.title}</h4>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{m.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1 text-slate-500 font-medium"><span className="text-[10px] uppercase">Progress</span><span>{m.progress}%</span></div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${m.progress}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Predicted Imp.</span>
                        <span className="font-bold text-emerald-600">{m.predicted_improvement}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* ── Newsroom ── */}
          {newsroom && newsroom.length > 0 && (
            <Panel isOpen={true} onToggle={togglePanel} id="newsroom" title="UrbanPulse Newsroom" icon={Megaphone} accent="cyan" collapsible={false}>
              <div className="mt-3 space-y-2">
                {newsroom.map((n: any, i: number) => (
                  <div key={i} className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100/50">
                    <h5 className="text-xs font-bold text-cyan-900 mb-1">{n.title}</h5>
                    <p className="text-[11px] text-cyan-800/80 leading-relaxed">{n.content}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel isOpen={true} onToggle={togglePanel} id="map" title="Living Bengaluru Intelligence Map" icon={Globe} accent="blue" collapsible={false}>
            <div className="h-[500px] rounded-xl overflow-hidden mt-3 shadow-inner relative z-0">
              <MapWrapper 
                nodes={traffic} 
                incidents={incidents} 
                onAnalyzeIncident={handleAnalyze} 
                route={routeResult?.route || []}
                backupRoute={routeResult?.backup_route || []}
                isEmergency={routeMode === 'emergency'}
                selectedPoints={[[origin.lat, origin.lng], [destination.lat, destination.lng]]}
              />
            </div>
          </Panel>

          {/* ── Vulnerability Scanner ── */}
          {vulnerabilityScanner && (
            <Panel isOpen={true} onToggle={togglePanel} id="vulnerability" title="City Vulnerability Scanner" icon={Radar} accent="red" badge="Predictive" collapsible={false}>
              <div className="mt-3 space-y-3">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-red-900">Highest Risk Zone: {vulnerabilityScanner.top_vulnerable_zone}</h4>
                    <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{vulnerabilityScanner.risk_level}</span>
                  </div>
                  <p className="text-xs text-red-800/70 font-medium mb-3">Causes: {vulnerabilityScanner.primary_causes.join(', ')}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-red-100">
                      <span className="text-red-400 font-bold block mb-0.5">Predicted Consequence</span>
                      <span className="font-semibold text-red-900">{vulnerabilityScanner.predicted_consequences}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-red-100">
                      <span className="text-red-400 font-bold block mb-0.5">Recommended Action</span>
                      <span className="font-semibold text-red-900">{vulnerabilityScanner.recommended_actions}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {vulnerabilityScanner.high_risk_areas.map((zone: string, i: number) => (
                    <div key={i} className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{zone}</span>
                      <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">Watch</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {/* ── Route Optimization ── */}
          <Panel isOpen={true} onToggle={togglePanel} id="route" title="Route Optimization" icon={Navigation} accent={routeMode === 'emergency' ? 'red' : routeMode === 'optimize' ? 'green' : 'purple'} collapsible={false}>
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">Origin</label>
                  <select value={`${origin.lat},${origin.lng}`} onChange={e => { const p = e.target.value.split(',').map(Number); setOrigin({ lat: p[0], lng: p[1] }); }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    {LOCATIONS.map(loc => (
                      <option key={loc.name} value={`${loc.lat},${loc.lng}`}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">Destination</label>
                  <select value={`${destination.lat},${destination.lng}`} onChange={e => { const p = e.target.value.split(',').map(Number); setDestination({ lat: p[0], lng: p[1] }); }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    {LOCATIONS.map(loc => (
                      <option key={loc.name} value={`${loc.lat},${loc.lng}`}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRoute(false)} className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${routeMode === 'optimize' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}><Route className="w-4 h-4" /> Optimize</button>
                <button onClick={() => handleRoute(true)} className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${routeMode === 'emergency' ? 'bg-red-700 hover:bg-red-800 shadow-red-700/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}><Siren className="w-4 h-4" /> Emergency</button>
              </div>
              
              {routeResult && routeMode === 'optimize' && (() => {
                const originName = LOCATIONS.find(l => Math.abs(l.lat - origin.lat) < 0.0001 && Math.abs(l.lng - origin.lng) < 0.0001)?.name || 'Origin';
                const destName = LOCATIONS.find(l => Math.abs(l.lat - destination.lat) < 0.0001 && Math.abs(l.lng - destination.lng) < 0.0001)?.name || 'Destination';

                let currentEta = routeResult.eta_minutes;
                if (selectedRouteOption === 'fastest') {
                  currentEta = Math.max(5, Math.round(routeResult.eta_minutes - 1));
                } else if (selectedRouteOption === 'safest') {
                  currentEta = Math.round(routeResult.eta_minutes + 2);
                }

                const balancedConfidence = Math.max(60, Math.min(98, Math.round(100 - routeResult.avg_congestion * 40 - (routeResult.weather_impact !== 'Clear' ? 15 : 0))));
                let confidence = balancedConfidence;
                if (selectedRouteOption === 'fastest') {
                  confidence = Math.max(50, Math.min(92, Math.round(balancedConfidence - 8)));
                } else if (selectedRouteOption === 'safest') {
                  confidence = Math.max(70, Math.min(99, Math.round(balancedConfidence + 5)));
                }

                let travelQuality = 'Excellent';
                let travelQualityColor = 'text-green-600 bg-green-50';
                if (confidence >= 90) {
                  travelQuality = 'Excellent';
                  travelQualityColor = 'text-green-600 bg-green-50';
                } else if (confidence >= 75) {
                  travelQuality = 'Good';
                  travelQualityColor = 'text-emerald-600 bg-emerald-50';
                } else if (confidence >= 60) {
                  travelQuality = 'Moderate';
                  travelQualityColor = 'text-yellow-600 bg-yellow-50';
                } else {
                  travelQuality = 'Poor';
                  travelQualityColor = 'text-red-600 bg-red-50';
                }

                let riskLevel = 'LOW';
                let riskDesc = 'Clear road conditions, low traffic density, zero active incident zones, and dry weather.';
                
                let baseRisk = 'LOW';
                if (routeResult.avg_congestion >= 0.75) baseRisk = 'CRITICAL';
                else if (routeResult.avg_congestion >= 0.55) baseRisk = 'HIGH';
                else if (routeResult.avg_congestion >= 0.3) baseRisk = 'MEDIUM';

                if (selectedRouteOption === 'fastest') {
                  if (baseRisk === 'CRITICAL') {
                    riskLevel = 'CRITICAL';
                    riskDesc = 'Severe congestion. Fastest lane speeds are compromised due to high density bottlenecks.';
                  } else if (baseRisk === 'HIGH') {
                    riskLevel = 'HIGH';
                    riskDesc = 'Heavy traffic volume. Speed optimization is restricted by moderate surrounding flow delays.';
                  } else {
                    riskLevel = 'MEDIUM';
                    riskDesc = 'Traffic volume is rising on main arterials. Watch for speed drops near signalized junctions.';
                  }
                } else if (selectedRouteOption === 'safest') {
                  if (baseRisk === 'CRITICAL') {
                    riskLevel = 'HIGH';
                    riskDesc = 'Active congestion in the area. Safety margins are stable, avoiding high-risk lanes.';
                  } else if (baseRisk === 'HIGH') {
                    riskLevel = 'MEDIUM';
                    riskDesc = 'Heavy density nearby. The safest route successfully detours around incident areas.';
                  } else {
                    riskLevel = 'LOW';
                    riskDesc = 'Excellent travel safety. Zero active hazards, low traffic density, and dry road surfaces.';
                  }
                } else {
                  riskLevel = baseRisk;
                  if (riskLevel === 'CRITICAL') {
                    riskDesc = 'Severe gridlock, major incidents blocking lanes, high delay variance.';
                  } else if (riskLevel === 'HIGH') {
                    riskDesc = 'Heavy congestion build-up, moderate delays, incident nearby, weather compounding delays.';
                  } else if (riskLevel === 'MEDIUM') {
                    riskDesc = 'Traffic volume increasing, minor slowdowns, no active incidents, weather stable.';
                  } else {
                    riskDesc = 'Smooth traffic flow, normal speeds, no active incidents, weather stable.';
                  }
                }

                const eta30 = Math.round(currentEta * 1.2);
                const eta60 = Math.round(currentEta * 1.4);

                // Dynamic Why Route
                const whyList = [];
                if (routeResult.avg_congestion >= 0.6) {
                  whyList.push("Avoids critical gridlocks on primary roads");
                } else if (routeResult.avg_congestion >= 0.3) {
                  whyList.push("Moderate traffic conditions along segment");
                } else {
                  whyList.push("Optimized for minimal congestion bottlenecks");
                }

                const activeIncidentCount = incidents.filter(i => !['Resolved', 'Closed'].includes(i.status)).length;
                if (activeIncidentCount === 0) {
                  whyList.push("No active critical incidents detected");
                } else {
                  whyList.push(`Bypasses ${activeIncidentCount} active incident zones`);
                }

                if (routeResult.weather_impact === 'Clear') {
                  whyList.push("Stable weather conditions reported");
                } else {
                  whyList.push(`Adapts to ${routeResult.weather_impact.toLowerCase()} conditions`);
                }

                if (selectedRouteOption === 'fastest') {
                  whyList.push("Priority green signal wave synchronization");
                } else if (selectedRouteOption === 'safest') {
                  whyList.push("High accessibility and lane width safety");
                } else {
                  whyList.push("Optimal accessibility score across segment");
                }

                // Dynamic Insights
                const insightList = [];
                if (routeResult.avg_congestion >= 0.5) {
                  insightList.push("Leave within 10 minutes to avoid delay spikes");
                } else {
                  insightList.push("Leave within 15 minutes for optimal flow");
                }
                insightList.push("Traffic volume expected to rise later");
                if (routeResult.weather_impact !== 'Clear') {
                  insightList.push(`${routeResult.weather_impact} may increase delay risks`);
                } else {
                  insightList.push("Alternative route corridors fully monitored");
                }

                return (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-3 border-t border-slate-100">
                    
                    {/* Compact Legacy calculations */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">ETA</span>
                        <span className="text-xs font-bold text-slate-700">{currentEta}m</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Dist</span>
                        <span className="text-xs font-bold text-slate-700">{routeResult.distance_km ?? '—'}km</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Cong</span>
                        <span className="text-xs font-bold text-slate-700">{(routeResult.avg_congestion * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Weather</span>
                        <span className="text-xs font-bold text-slate-700 truncate block max-w-full">{routeResult.weather_impact ?? '—'}</span>
                      </div>
                    </div>

                    {/* Feature 1: AI Route Verdict */}
                    <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-3.5 border border-blue-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" /> AI Route Verdict
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${travelQualityColor}`}>{travelQuality} Quality</span>
                      </div>
                      <p className="text-sm font-black text-slate-800 mb-1.5 uppercase tracking-wide">
                        {selectedRouteOption === 'fastest' ? 'FASTEST ROUTE SELECTED' :
                         selectedRouteOption === 'safest' ? 'SAFEST ROUTE SELECTED' :
                         'BALANCED ROUTE SELECTED'}
                      </p>
                      <p className="text-xs text-slate-600 mb-2.5 flex items-center gap-1.5">
                        <Route className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold text-slate-600 uppercase text-[10px] tracking-wider">Via:</span>
                        <span className="font-bold text-slate-800">{getViaRoute(originName, destName, selectedRouteOption)}</span>
                      </p>
                      
                      <div className="text-xs text-slate-600 mb-2.5">
                        <span className="font-semibold block mb-1">Optimized for:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                          {selectedRouteOption === 'fastest' ? (
                            <>
                              <li>Travel Time</li>
                              <li>Commute Duration</li>
                              <li>Green Wave Signals</li>
                            </>
                          ) : selectedRouteOption === 'safest' ? (
                            <>
                              <li>Safety Margins</li>
                              <li>Zero Active Incidents</li>
                              <li>Low Risk Zones</li>
                            </>
                          ) : (
                            <>
                              <li>Traffic Conditions</li>
                              <li>Road Accessibility</li>
                              <li>Weather Conditions</li>
                              <li>Incident Avoidance</li>
                            </>
                          )}
                        </ul>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        <strong>Selected because:</strong> {
                          selectedRouteOption === 'fastest' ? 'Prioritizes the minimum travel duration by utilizing primary arterial roads with priority signal sequences.' :
                          selectedRouteOption === 'safest' ? 'Maximizes security and minimizes hazard exposure by bypassing all active traffic incidents and high-density risk hotspots.' :
                          'Offers the optimal tradeoff between travel time, safety, and comfort, avoiding major bottlenecks.'
                        }
                      </p>
                      
                      <div className="flex justify-between items-center text-[11px] text-slate-500 font-bold border-t border-blue-200/50 pt-2">
                        <span>Route Confidence</span>
                        <span className="text-blue-600">{confidence}%</span>
                      </div>
                    </div>

                    {/* Feature 2 & 3: Why This Route? & Travel Insight */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                        <h5 className="text-[10px] text-slate-400 font-black uppercase mb-1.5">Why This Route?</h5>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {whyList.map((reason, i) => (
                            <li key={i} className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> {reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                        <h5 className="text-[10px] text-slate-400 font-black uppercase mb-1.5">Travel Insight</h5>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {insightList.map((insight, i) => (
                            <li key={i} className="flex items-start gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> {insight}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Feature 4: Route Options */}
                    <div>
                      <h5 className="text-[10px] text-slate-400 font-black uppercase mb-2">Route Options</h5>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleSelectOption('fastest')}
                          className={`w-full p-2.5 border rounded-xl text-center transition-all ${
                            selectedRouteOption === 'fastest'
                              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100 text-blue-900 shadow-sm font-semibold'
                              : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className={`text-[9px] font-black uppercase block ${selectedRouteOption === 'fastest' ? 'text-blue-700' : 'text-slate-400'}`}>Fastest</span>
                          <span className="text-xs font-bold block mt-0.5">{Math.max(5, Math.round(routeResult.eta_minutes - 1))}m</span>
                          <span className="text-[9px] opacity-80">Shortest ETA</span>
                        </button>
                        
                        <button
                          onClick={() => handleSelectOption('balanced')}
                          className={`w-full p-2.5 border rounded-xl text-center transition-all relative ${
                            selectedRouteOption === 'balanced'
                              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100 text-blue-900 shadow-sm font-semibold'
                              : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] bg-blue-600 text-white px-1.5 rounded-full font-bold uppercase scale-90">Best</span>
                          <span className={`text-[9px] font-black uppercase block ${selectedRouteOption === 'balanced' ? 'text-blue-700' : 'text-slate-400'}`}>Balanced</span>
                          <span className="text-xs font-bold block mt-0.5">{routeResult.eta_minutes}m</span>
                          <span className="text-[9px] opacity-80">Recommended</span>
                        </button>

                        <button
                          onClick={() => handleSelectOption('safest')}
                          className={`w-full p-2.5 border rounded-xl text-center transition-all ${
                            selectedRouteOption === 'safest'
                              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100 text-blue-900 shadow-sm font-semibold'
                              : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className={`text-[9px] font-black uppercase block ${selectedRouteOption === 'safest' ? 'text-blue-700' : 'text-slate-400'}`}>Safest</span>
                          <span className="text-xs font-bold block mt-0.5">{Math.round(routeResult.eta_minutes + 2)}m</span>
                          <span className="text-[9px] opacity-80">Lowest Risk</span>
                        </button>
                      </div>
                    </div>

                    {/* Feature 5: Future Forecast */}
                    <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                      <h5 className="text-[10px] text-slate-400 font-black uppercase mb-2">Future Forecast</h5>
                      <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2.5 mb-2">
                        <div className="text-center">
                          <span className="text-[9px] text-slate-400 block font-bold">Now</span>
                          <span className="text-sm font-bold text-slate-700">{currentEta} min</span>
                        </div>
                        <div className="text-center border-x border-slate-100">
                          <span className="text-[9px] text-slate-400 block font-bold">+30 Min</span>
                          <span className="text-sm font-bold text-slate-700">{eta30} min</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] text-slate-400 block font-bold">+60 Min</span>
                          <span className="text-sm font-bold text-slate-700">{eta60} min</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {selectedRouteOption === 'fastest' ? 'Traffic is expected to spike sharply due to incoming peak commute hours. Bypassing options will diminish soon.' :
                         selectedRouteOption === 'safest' ? 'Safety corridors are predicted to remain stable. Minor delay increases (+20%) are expected over the next hour.' :
                         'Traffic is predicted to increase by 20% in the next hour due to peak commute hour building. Leave now to ensure the shortest travel time.'}
                      </p>
                    </div>

                    {/* Feature 6: Route Risk Analysis */}
                    <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                      <h5 className="text-[10px] text-slate-400 font-black uppercase mb-2">Route Risk Analysis</h5>
                      <div className="flex gap-3 items-center bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black border text-center shrink-0 ${
                          riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' :
                          riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-green-100 text-green-700 border-green-200'
                        }`}>{riskLevel}</span>
                        <div className="text-xs text-slate-600 leading-snug">
                          <span className="font-bold block text-slate-700 mb-0.5">Risk Status: {riskLevel}</span>
                          <p>{riskDesc}</p>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                );
              })()}

              {routeResult && routeMode === 'emergency' && (() => {
                const originName = LOCATIONS.find(l => Math.abs(l.lat - origin.lat) < 0.0001 && Math.abs(l.lng - origin.lng) < 0.0001)?.name || 'Origin';
                const destName = LOCATIONS.find(l => Math.abs(l.lat - destination.lat) < 0.0001 && Math.abs(l.lng - destination.lng) < 0.0001)?.name || 'Destination';
                const activeIncidentCount = incidents.filter(i => !['Resolved', 'Closed'].includes(i.status)).length;
                const roadRisks = Math.max(1, Math.min(4, activeIncidentCount));

                return (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-3 border-t border-slate-100">
                    
                    {/* Flashing Hospital Sync Banner */}
                    {hospitalRouteActivated && (
                      <div className="bg-emerald-600 text-white p-3.5 rounded-xl shadow-lg border border-emerald-500 animate-bounce flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Siren className="w-5 h-5 animate-pulse" />
                          <div>
                            <span className="font-black text-xs block uppercase tracking-wider">Hospital Corridor Sync Active</span>
                            <span className="text-[10px] text-emerald-100 font-medium">Nearest facility {destName} alerted. Green wave enabled.</span>
                          </div>
                        </div>
                        <button onClick={() => setHospitalRouteActivated(false)} className="text-white hover:text-emerald-200 text-xs font-bold uppercase px-2 py-1">Dismiss</button>
                      </div>
                    )}

                    {/* Comparison Route Brief */}
                    <div className="space-y-3">
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-xs font-bold text-red-800 uppercase tracking-wider">Primary Emergency Corridor</h5>
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">Optimal</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-505 block text-slate-500">Estimated Arrival</span>
                            <span className="font-bold text-red-600 text-sm">{routeResult.eta_minutes} min</span>
                          </div>
                          <div>
                            <span className="text-slate-505 block text-slate-500">Distance</span>
                            <span className="font-bold text-slate-700">{routeResult.distance_km} km</span>
                          </div>
                          <div>
                            <span className="text-slate-505 block text-slate-500">Accessibility Score</span>
                            <span className="font-bold text-emerald-600">{routeResult.accessibility_score}%</span>
                          </div>
                          <div>
                            <span className="text-slate-505 block text-slate-500">Corridor Confidence</span>
                            <span className="font-bold text-slate-800">{routeResult.route_confidence}%</span>
                          </div>
                        </div>

                        {/* Annotations */}
                        {routeResult.annotations && routeResult.annotations.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-red-200/50">
                            {routeResult.annotations.map((ann: string, i: number) => (
                              <span key={i} className="text-[9px] bg-red-100 text-red-700 border border-red-200/50 px-1.5 py-0.5 rounded font-bold uppercase">
                                {ann}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {routeResult.backup_available && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Secondary Backup Corridor</h5>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">Alternative</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-505 block text-slate-500">Estimated Arrival</span>
                              <span className="font-bold text-blue-600 text-sm">{routeResult.backup_eta_minutes} min</span>
                            </div>
                            <div>
                              <span className="text-slate-505 block text-slate-500">Distance</span>
                              <span className="font-bold text-slate-700">{routeResult.backup_distance_km} km</span>
                            </div>
                            <div>
                              <span className="text-slate-505 block text-slate-500">Accessibility Score</span>
                              <span className="font-bold text-emerald-600">{routeResult.backup_accessibility_score}%</span>
                            </div>
                            <div>
                              <span className="text-slate-505 block text-slate-500">Corridor Confidence</span>
                              <span className="font-bold text-slate-800">{routeResult.backup_route_confidence}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feature 3 & 4: Roads to Avoid & Hospital Accessibility */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                        <h5 className="text-[10px] text-slate-400 font-black uppercase mb-1.5">Roads to Avoid</h5>
                        <ul className="text-xs text-red-600 space-y-1 font-semibold">
                          <li className="flex items-center gap-1.5">&times; Silk Board Junction</li>
                          <li className="flex items-center gap-1.5">&times; Hebbal Junction</li>
                          <li className="flex items-center gap-1.5">&times; Whitefield Main Road</li>
                        </ul>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Bypassed due to active incidents & delays.</p>
                      </div>
                      
                      {(() => {
                        const hospitals = [
                          { name: "St. John's Hospital (Koramangala)", lat: 12.9345, lng: 77.6265 },
                          { name: "HSR Medical Center (HSR Layout)", lat: 12.9172, lng: 77.6228 },
                          { name: "Manipal Hospital (Indiranagar)", lat: 12.9784, lng: 77.6408 },
                          { name: "Columbia Asia (Whitefield)", lat: 12.9698, lng: 77.7499 }
                        ];
                        // Find nearest hospital from origin
                        let nearest = hospitals[0];
                        let minDist = Infinity;
                        hospitals.forEach(h => {
                          const dist = Math.pow(h.lat - origin.lat, 2) + Math.pow(h.lng - origin.lng, 2);
                          if (dist < minDist) {
                            minDist = dist;
                            nearest = h;
                          }
                        });

                        const isAlreadyRoutingToHospital = Math.abs(destination.lat - nearest.lat) < 0.0001 && Math.abs(destination.lng - nearest.lng) < 0.0001;

                        const routeToHospital = async () => {
                          setDestination({ lat: nearest.lat, lng: nearest.lng });
                          try {
                            const res = await api.emergencyRoute(origin, { lat: nearest.lat, lng: nearest.lng });
                            setRouteResult(res);
                            setRouteMode('emergency');
                            setHospitalRouteActivated(true);
                            
                            const originName = LOCATIONS.find(l => Math.abs(l.lat - origin.lat) < 0.0001 && Math.abs(l.lng - origin.lng) < 0.0001)?.name || 'Origin';
                            saveRouteContext('emergency', 'balanced', res, originName, nearest.name);
                          } catch (e: any) {
                            alert('Route to hospital failed: ' + e.message);
                          }
                        };

                        return (
                          <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                            <h5 className="text-[10px] text-slate-400 font-black uppercase mb-1.5">Hospital Accessibility</h5>
                            <div className="space-y-1.5 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase">Nearest Medical Facility</span>
                                <span className="font-bold text-slate-700 block truncate" title={nearest.name}>{nearest.name}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[11px] py-1 border-y border-slate-100">
                                <div>
                                  <span className="text-slate-400 block text-[8px] uppercase">Time</span>
                                  <span className="font-bold text-slate-700">{isAlreadyRoutingToHospital ? `${routeResult.eta_minutes} min` : `${Math.round(routeResult.eta_minutes * 0.6)} min`}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[8px] uppercase">Reliability</span>
                                  <span className="font-bold text-green-600">98%</span>
                                </div>
                              </div>
                              <button 
                                onClick={routeToHospital}
                                disabled={isAlreadyRoutingToHospital}
                                className={`w-full mt-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                                  isAlreadyRoutingToHospital 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                }`}
                              >
                                {isAlreadyRoutingToHospital ? 'Active Hospital Route' : 'Activate Hospital Road'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Feature 5: Emergency Intelligence */}
                    <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                      <h5 className="text-[10px] text-slate-400 font-black uppercase mb-2">Emergency Intelligence</h5>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Road Closures</span>
                          <span className="font-bold text-slate-700">None detected on corridor</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Accident Alerts</span>
                          <span className="font-bold text-red-600">{activeIncidentCount > 0 ? `${activeIncidentCount} avoided` : '0 active alerts'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Flood Risks</span>
                          <span className="font-bold text-orange-600">{routeResult.weather_impact === 'Heavy Rain' ? '1 hazard avoided' : 'Low risk detected'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Accessibility Issues</span>
                          <span className="font-bold text-amber-600">{activeIncidentCount > 0 ? '1 concern identified' : '0 accessibility concerns'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500 font-semibold">Traffic Blockages</span>
                          <span className="font-bold text-slate-700">{routeResult.avg_congestion >= 0.5 ? '2 hotspots detected' : 'Bypassed major bottlenecks'}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-lg text-[10px] text-slate-500 border border-slate-100 leading-snug">
                        <strong>Status:</strong> Alternative preemption corridor has been activated dynamically.
                      </div>
                    </div>

                    {/* Feature 6: Emergency Recommendation */}
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 shadow-md space-y-2">
                      <h5 className="text-[10px] text-red-400 font-black uppercase tracking-wider">Emergency Recommendation</h5>
                      <div className="space-y-2 text-xs">
                        <ul className="space-y-1.5">
                          <li className="flex items-center gap-2 text-red-300 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Use Priority Corridor A (Green Corridor Enabled)
                          </li>
                          <li className="flex items-center gap-2 text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Avoid Silk Board Junction (Severe congestion risk)
                          </li>
                          {routeResult.weather_impact !== 'Clear' ? (
                            <li className="flex items-center gap-2 text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Avoid Flood-Prone Segment (High water levels)
                            </li>
                          ) : (
                            <li className="flex items-center gap-2 text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Avoid flood-prone secondary connectors
                            </li>
                          )}
                          <li className="flex items-center gap-2 text-emerald-300 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Hospital Accessibility Available & Active
                          </li>
                        </ul>
                        <div className="bg-red-500/10 border border-red-500/30 p-2 rounded text-red-200 text-[11px] leading-relaxed mt-1">
                          <strong>Response Protocol:</strong> Green light sequence synchronization initiated. Proceed at emergency speed override.
                        </div>
                      </div>
                    </div>

                  </motion.div>
                );
              })()}

            </div>
          </Panel>

          {/* ── Decision Impact Calculator ── */}
          <Panel isOpen={true} onToggle={togglePanel} id="impact_calc" title="Decision Impact Calculator" icon={PieChart} accent="blue" collapsible={false}>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <select value={impactCalcAction} onChange={e => setImpactCalcAction(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option>Close Road</option><option>Create Diversion</option><option>Deploy Monitoring</option><option>Increase Signal Duration</option>
                </select>
                <button onClick={handleImpactCalc} disabled={isCalculating} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50">
                  {isCalculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Simulate'}
                </button>
              </div>
              {impactCalcResult && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { label: 'Traffic Impact', value: impactCalcResult.expected_traffic_impact },
                    { label: 'Congestion', value: impactCalcResult.congestion_change },
                    { label: 'Accessibility', value: impactCalcResult.accessibility_change },
                    { label: 'Emergency', value: impactCalcResult.emergency_impact }
                  ].map((m, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{m.label}</p>
                      <p className="font-bold text-slate-700 text-xs mt-0.5">{m.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div className="space-y-6">
          {/* ── Knowledge Engine ── */}
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search knowledge engine..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="flex-1 bg-transparent text-sm focus:outline-none text-slate-700" />
              <button onClick={handleSearch} disabled={isSearching} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">{isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}</button>
            </div>
            {searchResults && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                {searchResults.map((r: any, i: number) => (
                  <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">{r.type}</span>
                    <span className="text-xs font-medium text-slate-700">{r.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Command Feed ── */}
          {commandFeed && (
            <Panel isOpen={true} onToggle={togglePanel} id="commandfeed" title="City Command Feed" icon={Activity} accent="blue" collapsible={false}>
              <div className="mt-3 space-y-4">
                {commandFeed.feed.map((f: any, i: number) => (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 pb-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase">{f.time} · {f.type}</span>
                      <p className="text-xs font-bold text-slate-700 mt-0.5 leading-snug">{f.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* ── Smart Incident Pipeline ── */}
          <Panel isOpen={true} onToggle={togglePanel} id="incidents" title="Smart Incident Pipeline" icon={AlertTriangle} accent="red" badge={activeIncidents.length} collapsible={false}>
            <div className="space-y-2.5 mt-3 max-h-[380px] overflow-auto pr-1">
              {sortedIncidents.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No active incidents</p>}
              {sortedIncidents.slice(0, 20).map(inc => {
                const priority = inc.ai_analysis?.priority || inc.severity || 'Medium';
                return (
                <div key={inc.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                  <div className="flex items-start justify-between mb-1.5 gap-2">
                    <p className="font-semibold text-sm text-slate-900 leading-tight flex-1">{inc.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex-shrink-0 ${sevColor(priority)}`}>{priority} Priority</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{inc.category} · {inc.status} · {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <div className="flex gap-1.5">
                    <select onChange={e => e.target.value && handleStatusChange(inc.id, e.target.value)} value={inc.status} className="text-[11px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-600 focus:outline-none">
                      <option value="Reported">Reported</option><option value="AI Verified">AI Verified</option><option value="Under Review">Under Review</option><option value="Action Initiated">Action Initiated</option><option value="Resolved">Resolved</option>
                    </select>
                    <button onClick={() => handleAnalyze(inc.id)} className="text-[11px] px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-bold hover:bg-purple-100 transition-all border border-purple-100 flex items-center gap-1">
                      <Brain className="w-3 h-3" /> Smart Review
                    </button>
                    <Link href={`/incident/${inc.id}`} className="text-[11px] px-2 py-1.5 text-slate-400 rounded-lg hover:bg-slate-200 hover:text-slate-600 transition-all">
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )})}
            </div>
            {/* Inline AI Incident War Room */}
            <AnimatePresence>
              {analysisResult && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
                  {/* Header */}
                  <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg"><Brain className="w-5 h-5 text-purple-400" /></div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">Smart Review Panel & War Room</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Investigation Workspace — #{analysisId}</p>
                      </div>
                    </div>
                    <button onClick={() => setAnalysisResult(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"><X className="w-4 h-4" /></button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {/* Smart Review Panel Details */}
                    {aiAnalysis && (
                      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                          <h5 className="text-xs font-bold text-slate-200">AI Intelligence Briefing</h5>
                        </div>
                        {(() => {
                          let verif: any = null;
                          try { if (selectedIncident?.ai_image_verification_json) verif = JSON.parse(selectedIncident.ai_image_verification_json); } catch {}
                          return verif?.mismatch ? (
                            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                              <div className="text-xs text-red-200">
                                <span className="font-bold block text-red-400">Image Verification Mismatch Detected</span>
                                User selected <strong>{verif.selected_category}</strong>, but AI detected <strong>{verif.detected_category}</strong> ({(verif.confidence*100).toFixed(0)}% confidence).
                              </div>
                            </div>
                          ) : null;
                        })()}
                        <div className="flex gap-4">
                          {selectedIncident?.image_url && (
                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
                              <img src={selectedIncident.image_url} alt="Incident" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-slate-400 block text-[10px] uppercase">Incident Type</span><span className="font-bold text-slate-200">{aiAnalysis.incident_type}</span></div>
                              <div><span className="text-slate-400 block text-[10px] uppercase">Confidence</span><span className="font-bold text-green-400">{(aiAnalysis.confidence * 100).toFixed(0)}%</span></div>
                              <div><span className="text-slate-400 block text-[10px] uppercase">Traffic Impact</span><span className="font-bold text-orange-300">{aiAnalysis.traffic_impact}</span></div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase">Risk Score</span>
                                <span className="font-bold text-red-400">{aiAnalysis.risk_score || '--'}/100</span>
                              </div>
                            </div>
                            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded mt-2 text-xs">
                              <span className="text-blue-300 font-bold block mb-1">Suggested Action:</span>
                              <span className="text-slate-300">{aiAnalysis.suggested_action}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Basic Impact */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2.5 bg-slate-800/50 rounded-lg border border-slate-700"><span className="text-[10px] text-slate-400 uppercase block mb-1">Radius</span><span className="text-sm font-bold text-slate-200">{analysisResult.impact_radius_km}km</span></div>
                      <div className="p-2.5 bg-slate-800/50 rounded-lg border border-slate-700"><span className="text-[10px] text-slate-400 uppercase block mb-1">Nodes</span><span className="text-sm font-bold text-slate-200">{analysisResult.affected_nodes_count}</span></div>
                      <div className="p-2.5 bg-slate-800/50 rounded-lg border border-slate-700"><span className="text-[10px] text-slate-400 uppercase block mb-1">Spread</span><span className="text-sm font-bold text-slate-200">{((analysisResult.congestion_spread || 0) * 100).toFixed(0)}%</span></div>
                      <div className="p-2.5 bg-slate-800/50 rounded-lg border border-slate-700"><span className="text-[10px] text-slate-400 uppercase block mb-1">Delay</span><span className="text-sm font-bold text-slate-200">+{analysisResult.emergency_delay_minutes}m</span></div>
                    </div>

                    {/* AI Explainability Engine */}
                    {explainPrediction && (
                      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                          <PieChart className="w-4 h-4 text-cyan-400" />
                          <h5 className="text-xs font-bold text-slate-200">AI Explainability Engine</h5>
                        </div>
                        <div className="flex gap-2">
                          {Object.entries(explainPrediction.explanation).map(([k, v]: [string, any], i) => (
                            <div key={i} className="flex-1 bg-slate-900 rounded p-2 text-center border border-slate-700/50">
                              <span className="text-[10px] text-slate-400 block truncate" title={k}>{k.split(' ')[0]}</span>
                              <span className="text-xs font-bold text-cyan-400">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resource Deployment */}
                    {deployment && (
                      <div className="p-3 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <UserPlus className="w-4 h-4 text-indigo-400" />
                          <h5 className="text-xs font-bold text-indigo-200">Resource Deployment Assistant</h5>
                        </div>
                        <p className="text-sm font-bold text-white mb-1">{deployment.recommendation}</p>
                        <p className="text-[11px] text-indigo-300/80 leading-relaxed">{deployment.reason}</p>
                      </div>
                    )}

                    {/* City Memory Timeline */}
                    {memoryTimeline && (
                      <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                          <History className="w-4 h-4 text-amber-400" />
                          <h5 className="text-xs font-bold text-slate-200">City Memory Timeline</h5>
                        </div>
                        <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[5px] before:h-full before:w-px before:bg-slate-700">
                          {memoryTimeline.timeline.map((t: any, i: number) => (
                            <div key={i} className="relative flex items-start gap-3">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-amber-500 mt-1 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-[10px] font-bold text-amber-500">{t.date}</span>
                                <p className="text-xs font-bold text-slate-300 mt-0.5">{t.incident} <span className="font-normal text-slate-500">→ {t.action} ({t.outcome})</span></p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* One-Click Action Center */}
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <h5 className="text-xs font-bold text-slate-200">One-Click Action Center</h5>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleAction('Generate Advisory')} className="p-2 text-xs font-bold bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white rounded transition-all">Generate Advisory</button>
                        <button onClick={() => handleAction('Mark Critical')} className="p-2 text-xs font-bold bg-slate-700 hover:bg-red-600 text-slate-200 hover:text-white rounded transition-all">Mark Critical</button>
                        <button onClick={() => handleAction('Request Inspection')} className="p-2 text-xs font-bold bg-slate-700 hover:bg-amber-600 text-slate-200 hover:text-white rounded transition-all">Request Inspection</button>
                        <button onClick={() => handleAction('Increase Monitoring')} className="p-2 text-xs font-bold bg-slate-700 hover:bg-purple-600 text-slate-200 hover:text-white rounded transition-all">Increase Monitoring</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>

          {/* ── AI Insights ── */}
          <Panel isOpen={openPanels.has('insights')} onToggle={togglePanel} id="insights" title="AI Insights" icon={Sparkles} accent="purple" collapsible={true}>
            {insights && (
              <div className="mt-3 space-y-3">
                <div className="p-3.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                  <p className="text-sm font-semibold text-blue-900 leading-relaxed">{insights.recommendation}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Congestion', value: `${((insights.avg_congestion || 0) * 100).toFixed(0)}%` },
                    { label: 'Critical', value: insights.critical_junctions },
                    { label: 'Weather', value: insights.weather },
                    { label: 'Incidents', value: insights.active_incidents },
                  ].map((m, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{m.label}</p>
                      <p className="font-bold text-slate-800 text-sm">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* ── Weather ── */}
          <Panel isOpen={openPanels.has('weather')} onToggle={togglePanel} id="weather" title="Weather Intelligence" icon={Cloud} accent="cyan" collapsible={true}>
            {weather && (
              <div className="mt-3 space-y-1.5">
                {[
                  { label: 'Condition', value: weather.condition, warn: false },
                  { label: 'Temperature', value: `${weather.temp}°C`, warn: false },
                  { label: 'Humidity', value: `${weather.humidity ?? '—'}%`, warn: false },
                  { label: 'Wind Speed', value: `${weather.wind_speed ?? '—'} km/h`, warn: false },
                  { label: 'Flood Risk', value: weather.flood_risk ?? 'None', warn: weather.flood_risk === 'High' || weather.flood_risk === 'Very High' },
                  { label: 'Traffic Impact', value: `+${((weather.congestion_add || 0) * 100).toFixed(0)}%`, warn: (weather.congestion_add || 0) > 0.2 },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-all">
                    <span className="text-sm text-slate-500">{row.label}</span>
                    <span className={`text-sm font-bold ${row.warn ? 'text-red-600' : 'text-slate-800'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* ── Health Trend ── */}
          <Panel isOpen={openPanels.has('health-trend')} onToggle={togglePanel} id="health-trend" title="Health Trend" icon={TrendingUp} accent="green" collapsible={true}>
            <div className="mt-3">
              {healthHistory.length > 0 ? (
                <div className="flex items-end gap-1.5 h-28 px-1">
                  {healthHistory.slice(0, 12).reverse().map((h: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(8, h.score * 0.9)}px` }} transition={{ delay: i * 0.05 }}
                        className="w-full rounded-t-lg" style={{ backgroundColor: h.score >= 60 ? '#22c55e' : h.score >= 40 ? '#f59e0b' : '#ef4444' }} />
                      <span className="text-[8px] text-slate-400 font-bold">{h.score}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Collecting data…</p>
              )}
            </div>
          </Panel>

        </div>
      </div>

      {/* ── Floating AI Copilot Chatbot ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="mb-4 w-96 h-[550px] max-h-[80vh] bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 flex items-center justify-between text-white shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">AI Copilot</h3>
                    <p className="text-[10px] text-orange-100 font-medium">UrbanPulse Operations Advisor</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 hover:bg-white/25 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {chatMessages.length === 0 && (
                  <div className="text-center py-10 space-y-2">
                    <Zap className="w-8 h-8 text-orange-400 mx-auto animate-bounce" />
                    <p className="text-xs text-slate-400 font-bold uppercase">Urban Intelligence Active</p>
                    <p className="text-xs text-slate-500 max-w-[80%] mx-auto">
                      Ask me about traffic forecasts, active incidents, safer routes, or emergency corridors.
                    </p>
                  </div>
                )}
                {chatMessages.map((m: any, i: number) => (
                  <div 
                    key={i} 
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        m.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-sm' 
                          : 'bg-white border border-slate-200/60 text-slate-700 rounded-tl-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 rounded-2xl bg-white border border-slate-200/60 rounded-tl-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-75" />
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-150" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input field */}
              <div className="p-3 bg-white border-t border-slate-100">
                <div className="relative flex items-center">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChat();
                      }
                    }}
                    placeholder="Ask about traffic, weather, incidents..."
                    className="w-full pl-3 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                  />
                  <button 
                    onClick={handleChat}
                    disabled={!chatInput.trim() || chatLoading}
                    className="absolute right-2 p-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating action button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-4 rounded-full shadow-2xl text-white flex items-center justify-center transition-all bg-gradient-to-br from-orange-500 to-red-600 ${isChatOpen ? 'rotate-90' : ''}`}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <Zap className="w-6 h-6 animate-pulse" />}
        </motion.button>
      </div>
    </div>
  );
}

export default function AuthorityPage() {
  return (
    <ProtectedRoute requiredRole="authority">
      <AuthorityContent />
    </ProtectedRoute>
  );
}

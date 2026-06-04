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
  Search, FileText, PieChart, Clock, CheckCircle2, Megaphone, UserPlus, Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import 'leaflet/dist/leaflet.css';

import MapWrapper from '@/components/MapWrapper';

interface TrafficNode { id: number; lat: number; lng: number; congestion: number; }
interface Incident { id: number; title: string; severity: string; status: string; lat?: number; lng?: number; category?: string; created_at: string; description?: string; }

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
          <motion.div initial={collapsible ? { height: 0, opacity: 0 } : false} animate={{ height: 'auto', opacity: 1 }} exit={collapsible ? { height: 0, opacity: 0 } : false} transition={{ duration: 0.25 }}>
            <div className={`px-5 pb-5 ${collapsible ? 'border-t border-slate-100' : ''}`}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [impactCalcAction, setImpactCalcAction] = useState('Close Road');
  const [impactCalcResult, setImpactCalcResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const togglePanel = (id: string) => setOpenPanels(p => {
    const next = new Set(p);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const loadAll = useCallback(async () => {
    try {
      const [tRes, iRes, wRes, hRes, cRes, insRes, hhRes, daRes, vsRes, cfRes, mRes, nRes] = await Promise.allSettled([
        api.getTrafficPredictions(), api.getIncidents(), api.getWeather(),
        api.getUrbanHealth(), api.getTrafficCongestion(), api.generateInsights(),
        api.getUrbanHealthHistory(12), api.getDecisionAssistant(), api.getVulnerabilityScanner(),
        api.getCommandFeed(), api.getMissions(), api.getNewsroom()
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
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); const id = setInterval(loadAll, 15000); return () => clearInterval(id); }, [loadAll]);

  const handleRoute = async (emergency = false) => {
    try {
      const fn = emergency ? api.emergencyRoute : api.optimizeRoute;
      setRouteResult(await fn(origin, destination));
    } catch (e: any) { alert('Route failed: ' + e.message); }
  };


  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatMessages(p => [...p, { role: 'user', text: msg }]);
    setChatLoading(true);
    try { const res = await api.chat(msg); setChatMessages(p => [...p, { role: 'ai', text: res.reply }]); }
    catch { setChatMessages(p => [...p, { role: 'ai', text: 'AI unavailable.' }]); }
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
        inc ? api.getMemoryEngine(inc.location) : Promise.resolve(null),
        inc ? api.explainPrediction(inc.location) : Promise.resolve(null),
        inc ? api.getMemoryTimeline(inc.location) : Promise.resolve(null),
        inc ? api.getResourceDeployment(inc.location) : Promise.resolve(null)
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
            <button onClick={logout} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ══ LEFT COLUMN ══ */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Urban Health', value: health?.score ?? '—', sub: health?.label ?? 'Loading', icon: Activity, gradient: health ? healthColor(health.score) : 'from-slate-400 to-slate-500', textC: health ? healthTextColor(health.score) : 'text-slate-500' },
              { label: 'Active Incidents', value: activeIncidents.length, sub: `${incidents.filter(i => i.severity === 'High' || i.severity === 'Critical').length} critical`, icon: AlertTriangle, gradient: 'from-orange-500 to-red-500', textC: 'text-orange-600' },
              { label: 'Congestion', value: congestion ? `${(congestion.avg_congestion * 100).toFixed(0)}%` : '—', sub: `${congestion?.critical_junctions ?? 0} critical`, icon: BarChart3, gradient: 'from-blue-500 to-indigo-600', textC: 'text-blue-600' },
              { label: 'Weather', value: weather?.condition ?? '—', sub: weather ? `${weather.temp}°C` : '', icon: ThermometerSun, gradient: 'from-cyan-500 to-teal-500', textC: 'text-cyan-600' },
            ].map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</span>
                </div>
                <p className={`text-2xl font-black ${card.textC}`}>{card.value}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">{card.sub}</p>
              </motion.div>
            ))}
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
          <Panel isOpen={true} onToggle={togglePanel} id="route" title="Route Optimization" icon={Navigation} accent="purple" collapsible={false}>
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
                <button onClick={() => handleRoute(false)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"><Route className="w-4 h-4" /> Optimize</button>
                <button onClick={() => handleRoute(true)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"><Siren className="w-4 h-4" /> Emergency</button>
              </div>
              {routeResult && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'ETA', value: `${routeResult.eta_minutes} min` },
                    { label: 'Distance', value: `${routeResult.distance_km ?? '—'} km` },
                    { label: 'Congestion', value: routeResult.avg_congestion ? `${(routeResult.avg_congestion * 100).toFixed(0)}%` : '—' },
                    { label: 'Weather', value: routeResult.weather_impact ?? '—' },
                  ].map((m, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{m.label}</p>
                      <p className="font-bold text-slate-800 text-sm">{m.value}</p>
                    </div>
                  ))}
                </motion.div>
              )}
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
                              <div><span className="text-slate-400 block text-[10px] uppercase">Location</span><span className="font-bold text-slate-200">{selectedIncident?.location}</span></div>
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

          {/* ── AI Copilot ── */}
          <Panel isOpen={openPanels.has('chat')} onToggle={togglePanel} id="chat" title="AI Copilot" icon={Zap} accent="orange" collapsible={true}>
            <div className="mt-3 space-y-2 max-h-56 overflow-auto pr-1">
              {chatMessages.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Ask about traffic, incidents, or city status</p>}
              {chatMessages.map((m, i) => (
                <div key={i} className={`p-2.5 rounded-xl text-sm ${m.role === 'user' ? 'bg-blue-100 text-blue-900 ml-6 font-medium' : 'bg-slate-100 text-slate-800 mr-6'}`}>{m.text}</div>
              ))}
              {chatLoading && <p className="text-xs text-slate-400 animate-pulse font-medium">AI is thinking…</p>}
            </div>
            <div className="flex gap-2 mt-3">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}
                placeholder="Ask about traffic, weather, incidents…"
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              <button onClick={handleChat} className="p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all shadow-md">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </Panel>
        </div>
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

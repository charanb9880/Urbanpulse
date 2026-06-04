'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Clock, MapPin, Activity, Brain, Shield,
  CheckCircle2, AlertTriangle, RefreshCw, ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const sevColor: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
};

const statusColor: Record<string, string> = {
  Reported: 'bg-yellow-100 text-yellow-700',
  'Under Review': 'bg-blue-100 text-blue-700',
  Verified: 'bg-green-100 text-green-700',
  Resolved: 'bg-slate-100 text-slate-700',
};

const getStreetName = (id: number) => {
  const streets = ["Outer Ring Road", "Hosur Road", "Sarjapur Road", "Bannerghatta Road", "MG Road", "Brigade Road", "100ft Road", "Koramangala 4th Block", "HSR Layout Sector 2", "Whitefield Main Rd"];
  return streets[id % streets.length];
};

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = Number(params.id);

  const [incident, setIncident] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const inc = await api.getIncident(id);
        setIncident(inc);
      } catch { /* 404 */ }
      setLoading(false);
    })();
  }, [id]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await api.analyzeIncident(id);
      setAnalysis(res);
    } catch (e: any) {
      alert('Analysis failed: ' + e.message);
    }
    setAnalyzing(false);
  };

  const handleVerify = async () => {
    try {
      const res = await api.verifyIncident(id);
      setIncident(res);
    } catch {}
  };

  const handleStatus = async (status: string) => {
    try {
      const res = await api.updateIncidentStatus(id, status);
      setIncident(res);
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
    </div>
  );

  if (!incident) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <AlertTriangle className="w-12 h-12 text-slate-300" />
      <p className="text-slate-600 text-lg">Incident not found</p>
      <button onClick={() => router.back()} className="text-blue-600 font-medium">Go back</button>
    </div>
  );

  const backLink = user?.role === 'authority' ? '/authority' : '/citizen';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-10">
        <Link href={backLink}>
          <div className="flex items-center gap-3">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Back</p>
              <h1 className="text-xl font-bold text-slate-900">Incident #{incident.id}</h1>
            </div>
          </div>
        </Link>
        <span className={`px-4 py-2 rounded-full text-sm font-bold border ${sevColor[incident.severity] || sevColor.Medium}`}>
          {incident.severity}
        </span>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid lg:grid-cols-3 gap-6">
        {/* ── Main Column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${sevColor[incident.severity] || 'bg-slate-100'}`}>
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{incident.title}</h2>
                <div className="flex items-center gap-3 text-slate-500 text-sm mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{incident.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{new Date(incident.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <p className="text-slate-700 mb-4">{incident.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Category</p><p className="font-bold text-slate-800">{incident.category}</p></div>
              <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Status</p><p className={`font-bold px-2 py-0.5 rounded-full text-xs inline-block ${statusColor[incident.status] || ''}`}>{incident.status}</p></div>
              <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Confirmations</p><p className="font-bold text-slate-800">{incident.verification_count ?? 0}</p></div>
              <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Verified</p><p className="font-bold">{incident.verified ? 'Yes' : 'No'}</p></div>
            </div>

            {incident.image_url && (
              <div className="mt-4">
                <img src={incident.image_url} alt="Evidence" className="w-full max-h-64 object-cover rounded-xl border border-slate-200" />
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" /> Status Timeline</h3>
            <div className="space-y-4">
              {[
                { label: 'Reported', done: true },
                { label: 'Under Review', done: ['Under Review', 'Verified', 'Resolved'].includes(incident.status) },
                { label: 'Verified', done: ['Verified', 'Resolved'].includes(incident.status) },
                { label: 'Resolved', done: incident.status === 'Resolved' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${step.done ? 'bg-green-500' : 'bg-slate-200'}`} />
                  <span className={`text-sm ${step.done ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Side Column ── */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 mb-2">Actions</h3>
            {!incident.verified && (
              <button onClick={handleVerify} className="w-full py-3 bg-blue-50 text-blue-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-100">
                <ThumbsUp className="w-4 h-4" /> Confirm Incident ({incident.verification_count ?? 0}/3)
              </button>
            )}
            {user?.role === 'authority' && (
              <div className="space-y-2">
                <select onChange={e => e.target.value && handleStatus(e.target.value)} defaultValue="" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                  <option value="" disabled>Update Status</option>
                  <option>Under Review</option><option>Verified</option><option>Resolved</option>
                </select>
              </div>
            )}
            <button onClick={runAnalysis} disabled={analyzing} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:shadow-md disabled:opacity-50">
              <Brain className="w-4 h-4" /> {analyzing ? 'Analyzing…' : 'Run AI Analysis'}
            </button>
          </div>

          {/* AI Analysis */}
          {analysis && (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Brain className="w-5 h-5 text-purple-600" /> AI Consequence Analysis</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Impact Radius</p><p className="font-bold">{analysis.impact_radius_km ?? '—'} km</p></div>
                <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Affected Nodes</p><p className="font-bold">{analysis.affected_nodes_count ?? 0}</p></div>
                <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Congestion Spread</p><p className="font-bold">{analysis.congestion_spread ? `${(analysis.congestion_spread * 100).toFixed(0)}%` : '—'}</p></div>
                <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Emergency Delay</p><p className="font-bold">+{analysis.emergency_delay_minutes ?? '—'} min</p></div>
                <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Accessibility Reduction</p><p className="font-bold">{analysis.accessibility_reduction ? `${(analysis.accessibility_reduction * 100).toFixed(0)}%` : '—'}</p></div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-xs text-blue-500 mb-1">Recommendations</p>
                  <ul className="list-disc list-inside text-blue-800 space-y-1">
                    {(analysis.recommended_actions || []).map((a: string, i: number) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Consequence Map */}
          {analysis?.affected_nodes?.length > 0 && (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Activity className="w-5 h-5 text-green-600" /> Affected Road Nodes</h3>
              <p className="text-xs text-slate-500 mb-2">{analysis.affected_nodes.length} nodes within {analysis.impact_radius_km} km</p>
              <div className="max-h-40 overflow-auto space-y-1">
                {analysis.affected_nodes.slice(0, 10).map((n: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">{getStreetName(n.id)} <span className="text-slate-400 font-normal">({String(n.id).slice(-4)})</span></span>
                    <span className="text-slate-500">{n.distance_km} km — cong: {((n.predicted_congestion || 0) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

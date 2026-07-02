'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Activity,
  Brain,
  MapPin,
  Clock,
  Shield,
  ArrowUpRight,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface Incident {
  id: number;
  title: string;
  severity: string;
  created_at: string;
  location: string;
}

function OfficerContent() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [insight, setInsight] = useState({ recommendation: 'Analyzing traffic flows...', weather: 'Clear' });
  const { logout } = useAuth();

  useEffect(() => {
    console.log("Frontend initialized: Officer Mission Control");
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      
      try {
        const mlInsights = await api.generateInsights();
        setInsight(mlInsights);
      } catch (mlErr) {
        // Fallback if ML server offline
      }
    } catch (err) {
      console.error(err);
    }
  };

  const storyEvents = [
    { time: '18:42', event: 'Accident reported at Silk Board' },
    { time: '18:44', event: 'AI classified severity as CRITICAL' },
    { time: '18:46', event: 'Traffic impact detected (2km radius)' },
    { time: '18:48', event: 'Response unit dispatched' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200">
      <header className="px-6 py-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <Link href="/">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Mission Control</h1>
              <p className="text-xs text-slate-500">City of Bengaluru</p>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-slate-600">Live</span>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <LogOut className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold mb-1 text-slate-900">City Status</h2>
            <p className="text-slate-600 mb-6">Live urban health monitoring</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Urban Health', value: 'Stable', color: 'text-green-700' },
                { label: 'Emergency Readiness', value: '92%', color: 'text-blue-700' },
                { label: 'Active Incidents', value: incidents.length, color: 'text-yellow-700' },
                { label: 'Response Time', value: '7 min', color: 'text-purple-700' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1 text-slate-900">Critical Incidents</h2>
                <p className="text-slate-600">Requires immediate attention</p>
              </div>
            </div>

            <div className="space-y-4">
              {incidents.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No active incidents at this time</p>
                </div>
              ) : (
                incidents.map((incident, i) => (
                  <Link
                    key={incident.id}
                    href={`/incident/${incident.id}`}
                    className="block"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-5 rounded-2xl border transition-all ${
                        incident.severity === 'Critical'
                          ? 'bg-red-50 border-red-200 hover:bg-red-100'
                          : incident.severity === 'High'
                            ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                            : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${
                            incident.severity === 'Critical'
                              ? 'bg-red-100 text-red-700'
                              : incident.severity === 'High'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-slate-900">{incident.title}</h3>
                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {incident.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(incident.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowUpRight className="w-6 h-6 text-slate-400" />
                      </div>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6 text-purple-700" />
              <h3 className="text-xl font-bold text-slate-900">Live AI Tactical Insights</h3>
            </div>
            <p className="text-slate-700 font-medium">
              {insight.recommendation}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Weather Impact: {insight.weather}
            </p>
            <div className="flex flex-col gap-2 mt-4">
              <button 
                onClick={async () => {
                  try {
                    const res = await api.routeOptimization({ lat: 12.9172, lng: 77.6228 }, { lat: 12.9345, lng: 77.6265 });
                    alert(`Emergency unit dispatched. Optimal route computed using STGNN with metric: ${res.distance_metric}`);
                  } catch (e) {
                    alert('Routing failed to compute. Is the ML service running?');
                  }
                }}
                className="w-full py-3 bg-red-600 rounded-xl text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                Dispatch Emergency Route (Silk Board)
              </button>

            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-6 h-6 text-blue-700" />
              <h3 className="text-xl font-bold text-slate-900">City Story</h3>
            </div>
            <div className="space-y-4">
              {storyEvents.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    {i < storyEvents.length - 1 && (
                      <div className="w-0.5 h-full bg-slate-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-xs text-slate-500 mb-1">{item.time}</p>
                    <p className="text-sm text-slate-700">{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OfficerPage() {
  return (
    <ProtectedRoute requiredRole="officer">
      <OfficerContent />
    </ProtectedRoute>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Activity, Map as MapIcon, TrendingUp, AlertTriangle, CloudRain, Clock, LogOut } from 'lucide-react';
import MapWrapper from '@/components/MapWrapper';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const LOCATIONS = {
  "Silk Board Junction": { lat: 12.9172, lng: 77.6228 },
  "Koramangala BDA Complex": { lat: 12.9345, lng: 77.6265 },
  "Forum Mall Koramangala": { lat: 12.9343, lng: 77.6112 },
  "Madiwala Police Station": { lat: 12.9226, lng: 77.6174 },
  "HSR Layout Sector 1": { lat: 12.9116, lng: 77.6389 },
  "St. John's Hospital": { lat: 12.9304, lng: 77.6214 },
};

export default function CongestionForecastingCenter() {
  const { logout } = useAuth();
  const [nodes, setNodes] = useState([]);
  const [route, setRoute] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPoints, setSelectedPoints] = useState<[number, number][]>([]);
  const [originName, setOriginName] = useState('');
  const [destName, setDestName] = useState('');
  const [eta, setEta] = useState<number | null>(null);
  const [weather, setWeather] = useState({ condition: 'Clear', temp: 28 });
  const [metrics, setMetrics] = useState({ mae: 0.1521 });

  const [error, setError] = useState('');

  // Fetch data only once on mount
  useEffect(() => {
    console.log("Frontend initialized: Analyst Dashboard");
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.predictTraffic();
      setNodes(data.predictions);
      if (data.weather) setWeather(data.weather);
      console.log("Traffic loaded successfully");
      
      const metricsData = await api.getModelMetrics();
      setMetrics(metricsData);
      console.log("AI loaded successfully");
      
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load predictions. Is the ML backend running?');
      setIsLoading(false);
    }
  };

  const handleRouteRequest = async () => {
    if (!originName || !destName) return;

    const originCoords = LOCATIONS[originName as keyof typeof LOCATIONS];
    const destCoords = LOCATIONS[destName as keyof typeof LOCATIONS];

    setSelectedPoints([
      [originCoords.lat, originCoords.lng],
      [destCoords.lat, destCoords.lng]
    ]);

    try {
      const res = await api.routeOptimization(originCoords, destCoords);
      setRoute(res.route);
      setEta(res.eta_minutes);
    } catch (err) {
      console.error("Routing failed:", err);
      alert("Failed to compute route.");
    }
  };

  const clearRouting = () => {
    setOriginName('');
    setDestName('');
    setSelectedPoints([]);
    setRoute([]);
    setEta(null);
  };

  return (
    <ProtectedRoute requiredRole="analyst">
      <div className="min-h-screen bg-slate-50 pt-20 px-6 pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Congestion Forecasting Center</h1>
              <p className="text-slate-600">Powered by PyTorch Geometric STGNN</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchPredictions} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">
                Refresh Predictions
              </button>
              <button onClick={logout} aria-label="Logout" className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-100">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Area */}
            <div className="lg:col-span-2 h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 relative p-4">
              <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  +1 Hour Forecast
                </h3>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Low</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Med</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> High</div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="w-full h-full rounded-xl bg-slate-100 animate-pulse flex items-center justify-center">
                   <span className="text-slate-500 font-semibold">Loading Map & AI Models...</span>
                </div>
              ) : error ? (
                <div className="w-full h-full rounded-xl bg-red-50 flex items-center justify-center border border-red-200 p-4 text-center">
                  <div className="text-red-600">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
                    <p className="font-semibold">{error}</p>
                  </div>
                </div>
              ) : (
                <MapWrapper 
                  nodes={nodes} 
                  route={route} 
                  selectedPoints={selectedPoints}
                />
              )}
            </div>

            {/* Sidebar Tools */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Graph Neural Network Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Model</span>
                    <span className="font-semibold text-slate-800">STGNN (Live)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Live Test MAE</span>
                    <span className="font-semibold text-green-600">{metrics.mae.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Graph Nodes</span>
                    <span className="font-semibold text-slate-800">{nodes.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-purple-500" />
                  Intelligent Routing
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Select start and end locations to compute an STGNN optimized safe route avoiding congestion.
                </p>
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Origin (Ambulance)</label>
                    <select 
                      value={originName} 
                      onChange={(e) => setOriginName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Origin...</option>
                      {Object.keys(LOCATIONS).map(loc => (
                        <option key={loc} value={loc} disabled={loc === destName}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Destination (Hospital)</label>
                    <select 
                      value={destName} 
                      onChange={(e) => setDestName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Destination...</option>
                      {Object.keys(LOCATIONS).map(loc => (
                        <option key={loc} value={loc} disabled={loc === originName}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={handleRouteRequest}
                    disabled={!originName || !destName}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Compute Route
                  </button>
                  <button 
                    onClick={clearRouting}
                    className="px-4 py-3 bg-slate-100 text-slate-800 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                {eta !== null && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">Estimated Travel Time</span>
                    </div>
                    <span className="text-2xl font-bold text-green-700">{eta} min</span>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="font-bold text-blue-900 text-lg mb-2 flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-blue-500" />
                  Live Weather Impact
                </h3>
                <p className="text-sm text-blue-800 mb-2">
                  Condition: <strong>{weather.condition}</strong> ({weather.temp}°C)
                </p>
                <p className="text-xs text-blue-600">
                  {weather.condition === 'Clear' ? 'No major weather impact on traffic flow.' : 'Inclement weather is dynamically reducing estimated safe speeds on all graph edges.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

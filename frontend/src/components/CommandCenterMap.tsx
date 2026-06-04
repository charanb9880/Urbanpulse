'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMapEvents, Marker } from 'react-leaflet';
import { Activity, CloudRain, Navigation, Sparkles, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Node {
  id: string | number;
  name?: string;
  lat: number;
  lng: number;
  congestion: number;
  prediction?: string;
}

interface MapProps {
  nodes?: Node[];
  route?: [number, number][];
  selectedPoints?: [number, number][];
  weather?: any;
  urbanHealth?: any;
  incidents?: any[];
}

function MapInteraction({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function CommandCenterMap({ nodes = [], route = [], selectedPoints = [], weather, urbanHealth, incidents = [] }: MapProps) {
  const [timelineOffset, setTimelineOffset] = useState(0); // 0, 15, 30, 60
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/marker-icon-2x.png',
        iconUrl: '/marker-icon.png',
        shadowUrl: '/marker-shadow.png',
      });
    });
  }, []);

  // Simulate timeline prediction visually (shifting congestion)
  const currentNodes = useMemo(() => {
    return nodes.map((n, i) => {
      let shift = 0;
      if (timelineOffset === 15) shift = 0.1;
      if (timelineOffset === 30) shift = 0.2;
      if (timelineOffset === 60) shift = -0.15;
      
      // Synthesize spread based on index to look cool
      if (i % 2 === 0 && timelineOffset > 0) shift += 0.15; 
      
      const newCongestion = Math.max(0, Math.min(1, n.congestion + shift));
      return { ...n, congestion: newCongestion };
    });
  }, [nodes, timelineOffset]);

  const getCongestionColor = (level: number) => {
    if (level > 0.8) return '#ef4444'; // Red (Critical)
    if (level > 0.5) return '#f59e0b'; // Amber (Moderate)
    return '#10b981'; // Green (Low)
  };

  // Synthesize edges for visual traffic flow connecting nodes closely
  const syntheticEdges = useMemo(() => {
    if (currentNodes.length <= 1) return [];
    const edges = [];
    for (let i = 0; i < currentNodes.length; i++) {
      for (let j = i + 1; j < currentNodes.length; j++) {
        const n1 = currentNodes[i];
        const n2 = currentNodes[j];
        const dist = Math.sqrt(Math.pow(n1.lat - n2.lat, 2) + Math.pow(n1.lng - n2.lng, 2));
        if (dist < 0.04) {
          edges.push({ n1, n2, avgCongestion: (n1.congestion + n2.congestion) / 2 });
        }
      }
    }
    return edges;
  }, [currentNodes]);

  const center: [number, number] = nodes.length > 0 ? [nodes[0].lat, nodes[0].lng] : [12.9345, 77.6265];
  const L = typeof window !== 'undefined' ? require('leaflet') : null;

  return (
    <div className="w-full h-full relative bg-slate-900 overflow-hidden font-sans">
      <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%', zIndex: 10 }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Animated Traffic Flow (Edges) */}
        {syntheticEdges.map((edge, idx) => (
          <Polyline 
            key={`edge-${idx}`}
            positions={[[edge.n1.lat, edge.n1.lng], [edge.n2.lat, edge.n2.lng]]}
            pathOptions={{
              color: getCongestionColor(edge.avgCongestion),
              weight: edge.avgCongestion > 0.8 ? 5 : 3,
              opacity: 0.7,
              dashArray: '10, 15',
              className: 'traffic-flow-path'
            }}
          />
        ))}

        {/* Incident Risk Markers */}
        {L && incidents.filter(i => i.lat && i.lng).map((inc: any) => {
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="relative flex items-center justify-center w-10 h-10 group">
                     <div class="absolute inset-0 bg-red-500 rounded-full opacity-40 animate-ping"></div>
                     <div class="relative bg-red-600 rounded-full w-7 h-7 flex items-center justify-center border-2 border-slate-900 shadow-lg group-hover:scale-110 transition-transform">
                       <span class="text-white text-sm font-bold">!</span>
                     </div>
                   </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });
          return <Marker key={`inc-${inc.id}`} position={[inc.lat, inc.lng]} icon={icon} />;
        })}

        {/* Glowing Junctions */}
        {L && currentNodes.map((node) => {
          const color = getCongestionColor(node.congestion);
          const isCritical = node.congestion > 0.8;
          
          const pulseRingHtml = isCritical ? '<div class="absolute inset-0 rounded-full" style="background-color: ' + color + '; animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>' : '';
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="relative flex items-center justify-center cursor-pointer group" style="width: 24px; height: 24px;">
                     ${pulseRingHtml}
                     <div class="relative rounded-full border-2 border-slate-900 transition-transform group-hover:scale-125" 
                          style="width: 14px; height: 14px; background-color: ${color}; box-shadow: 0 0 15px ${color};">
                     </div>
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          return (
            <Marker 
              key={node.id} 
              position={[node.lat, node.lng]} 
              icon={icon}
              eventHandlers={{ click: () => setSelectedNode(node) }}
            />
          );
        })}

        {/* User Selected Points (A / B) */}
        {L && selectedPoints.map((point, i) => {
          const isOrigin = i === 0;
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background: ${isOrigin ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #ef4444, #b91c1c)'}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.9); box-shadow: 0 0 15px ${isOrigin ? '#3b82f6' : '#ef4444'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px;">
                     ${isOrigin ? 'A' : 'B'}
                   </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          return <Marker key={`sel-${i}`} position={point} icon={icon} />;
        })}

        {/* Draw Route */}
        {route.length > 0 && (
          <Polyline 
            positions={route} 
            pathOptions={{ 
              color: '#38bdf8', 
              weight: 6, 
              opacity: 0.9,
              dashArray: '15, 10',
              className: 'traffic-flow-path'
            }} 
          />
        )}
      </MapContainer>

      {/* ── GLASSMORPHIC UI OVERLAYS ── */}

      {/* Top Left: Weather & Health Impact */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-3 pointer-events-none">
        {weather && (
          <div className="glass-panel px-4 py-3 rounded-xl flex items-center gap-3 text-white shadow-xl">
            <CloudRain className="w-6 h-6 text-blue-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weather Risk</div>
              <div className="text-sm font-bold leading-tight">{weather.condition}, {weather.temp}°C</div>
            </div>
          </div>
        )}
        {urbanHealth && (
          <div className="glass-panel px-4 py-3 rounded-xl flex items-center gap-3 text-white shadow-xl">
            <Activity className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Urban Health</div>
              <div className="text-sm font-bold text-emerald-400 leading-tight">{urbanHealth.label} ({urbanHealth.score})</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Center: Timeline Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] glass-panel p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl">
        <div className="px-4 text-[10px] font-bold text-slate-400 tracking-widest uppercase border-r border-slate-700/50">Prediction</div>
        {[0, 15, 30, 60].map(mins => (
          <button
            key={mins}
            onClick={() => setTimelineOffset(mins)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${timelineOffset === mins ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            {mins === 0 ? 'NOW' : `+${mins}m`}
          </button>
        ))}
      </div>

      {/* Right Side: Critical Junction Premium Panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 z-[400] glass-panel rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-5 border-b border-slate-700/50 flex items-start justify-between bg-slate-900/80">
            <div>
              <h3 className="font-bold text-white text-lg">{selectedNode.name || `Junction ${selectedNode.id}`}</h3>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                {selectedNode.lat.toFixed(4)}, {selectedNode.lng.toFixed(4)}
              </div>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-1.5 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div className="p-5 space-y-5 bg-slate-900/40">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>Congestion Spread</span>
                <span style={{ color: getCongestionColor(selectedNode.congestion) }}>
                  {(selectedNode.congestion * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${selectedNode.congestion * 100}%`,
                    backgroundColor: getCongestionColor(selectedNode.congestion),
                    boxShadow: `0 0 10px ${getCongestionColor(selectedNode.congestion)}`
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/50">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Delay</div>
                <div className="text-xl font-black text-white">+{Math.ceil(selectedNode.congestion * 18)} min</div>
              </div>
              <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/50">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Risk Level</div>
                <div className="text-xl font-black" style={{ color: getCongestionColor(selectedNode.congestion) }}>
                  {selectedNode.congestion > 0.8 ? 'CRITICAL' : selectedNode.congestion > 0.5 ? 'HIGH' : 'LOW'}
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">AI Recommendation</span>
              </div>
              <p className="text-sm text-blue-100/70 leading-relaxed font-medium">
                {selectedNode.congestion > 0.8 
                  ? "Severe propagation risk detected. Recommend immediate traffic diversion to alternative corridors." 
                  : "Flow is currently manageable. Continue standard monitoring and predictive analysis."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMapEvents, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Node {
  id: number;
  lat: number;
  lng: number;
  congestion: number; // 0 to 1
  name?: string;
  trend?: string;
}

interface MapProps {
  nodes?: Node[];
  route?: [number, number][]; // Array of [lat, lng]
  backupRoute?: [number, number][]; // Array of [lat, lng]
  isEmergency?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  selectedPoints?: [number, number][];
  incidents?: any[];
  onAnalyzeIncident?: (id: number) => void;
}

function ChangeMapBounds({ route, backupRoute }: { route: [number, number][]; backupRoute?: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const allCoords: [number, number][] = [];
    if (route && route.length > 0) {
      allCoords.push(...route);
    }
    if (backupRoute && backupRoute.length > 0) {
      allCoords.push(...backupRoute);
    }
    
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [50, 50] });
    }
  }, [route, backupRoute, map]);
  return null;
}

export default function GraphMap({ 
  nodes = [], 
  route = [], 
  backupRoute = [],
  isEmergency = false,
  onMapClick, 
  selectedPoints = [], 
  incidents = [], 
  onAnalyzeIncident 
}: MapProps) {
  const [L, setL] = useState<any>(null);

  // Fix Leaflet marker icons in Next.js
  useEffect(() => {
    import('leaflet').then((leafletInstance) => {
      delete (leafletInstance.Icon.Default.prototype as any)._getIconUrl;
      leafletInstance.Icon.Default.mergeOptions({
        iconRetinaUrl: '/marker-icon-2x.png',
        iconUrl: '/marker-icon.png',
        shadowUrl: '/marker-shadow.png',
      });
      setL(leafletInstance);
    });
  }, []);

  const getCongestionColor = (level: number) => {
    if (level > 0.75) return '#ef4444'; // Red
    if (level > 0.50) return '#f97316'; // Orange
    if (level > 0.25) return '#f59e0b'; // Yellow
    return '#22c55e'; // Green
  };

  const getRiskLabel = (level: number) => {
    if (level > 0.75) return 'Critical';
    if (level > 0.50) return 'Heavy';
    if (level > 0.25) return 'Moderate';
    return 'Low';
  };

  // Default to Koramangala roughly
  const center: [number, number] = nodes.length > 0 ? [nodes[0].lat, nodes[0].lng] : [12.9345, 77.6265];

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

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <MapContainer
        center={center}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
      >
        <MapInteraction onClick={onMapClick} />
        <ChangeMapBounds route={route} backupRoute={backupRoute} />
        
        {/* Minimal light tile layer */}
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Draw Graph Nodes */}
        {L && nodes.map((node) => {
          const color = getCongestionColor(node.congestion);
          const score = Math.round(node.congestion * 100);
          const risk = getRiskLabel(node.congestion);
          const trend = node.trend || 'Stable';
          const isCritical = node.congestion > 0.75;

          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="relative flex items-center justify-center cursor-pointer group" style="width: 20px; height: 20px;">
                     ${isCritical ? '<div class="absolute inset-0 rounded-full animate-ping" style="background-color: ' + color + '; opacity: 0.4;"></div>' : ''}
                     <div class="relative rounded-full border border-slate-900 shadow-md transition-all group-hover:scale-125" 
                          style="width: 10px; height: 10px; background-color: ${color}; box-shadow: 0 0 8px ${color};">
                     </div>
                   </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          return (
            <Marker 
              key={node.id} 
              position={[node.lat, node.lng]} 
              icon={icon}
            >
              <Tooltip sticky direction="top" className="custom-tooltip font-sans">
                <div className="p-1 space-y-1">
                  <div className="font-bold text-xs text-white">{node.name || `Junction #${node.id}`}</div>
                  <div className="flex justify-between gap-4 text-[10px] text-slate-300">
                    <span>Congestion:</span>
                    <span className="font-bold" style={{ color }}>{score}% ({risk})</span>
                  </div>
                  <div className="flex justify-between gap-4 text-[10px] text-slate-300">
                    <span>Trend:</span>
                    <span className={`font-semibold ${trend === 'Worsening' ? 'text-red-400' : trend === 'Improving' ? 'text-green-400' : 'text-slate-400'}`}>{trend}</span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Fallback rendering when L is not loaded */}
        {!L && nodes.map((node) => (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lng]}
            radius={node.congestion > 0.75 ? 5 : 3}
            pathOptions={{
              color: getCongestionColor(node.congestion),
              fillColor: getCongestionColor(node.congestion),
              fillOpacity: 0.7,
              weight: 1
            }}
          >
            <Popup>
              Node ID: {node.id}<br/>
              Congestion: {(node.congestion * 100).toFixed(1)}%
            </Popup>
          </CircleMarker>
        ))}

        {/* Draw User Selected Points (Origin/Dest) */}
        {L && selectedPoints.map((point, i) => {
          const isOrigin = i === 0;
          
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${isOrigin ? '#3b82f6' : '#ef4444'}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; font-family: sans-serif;">
                     ${isOrigin ? 'A' : 'H'}
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          return (
            <Marker key={i} position={point} icon={icon}>
              <Popup>{isOrigin ? 'Ambulance Origin' : 'Hospital Destination'}</Popup>
            </Marker>
          );
        })}

        {/* Draw Primary Route */}
        {route.length > 0 && (
          <Polyline 
            key={`route-${route.length}-${isEmergency}`}
            positions={route} 
            pathOptions={{ 
              color: isEmergency ? '#ef4444' : '#6366f1', 
              weight: isEmergency ? 8 : 6, 
              opacity: 0.9,
              className: isEmergency ? 'emergency-route-primary' : 'traffic-flow-path'
            }} 
          />
        )}

        {/* Draw Backup Route */}
        {isEmergency && backupRoute.length > 0 && (
          <Polyline 
            key={`backup-${backupRoute.length}`}
            positions={backupRoute} 
            pathOptions={{ 
              color: '#3b82f6', 
              weight: 5, 
              opacity: 0.7,
              className: 'emergency-route-secondary'
            }} 
          />
        )}

        {/* Draw Incidents */}
        {L && incidents.filter(i => i.lat && i.lng && i.status !== 'Resolved').map((inc) => {
          const color = inc.severity === 'Critical' ? '#ef4444' : inc.severity === 'High' ? '#f97316' : '#eab308';
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); animation: pulse-ring 2s infinite;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          return (
            <Marker 
              key={inc.id} 
              position={[inc.lat, inc.lng]} 
              icon={icon}
              eventHandlers={{
                click: () => onAnalyzeIncident && onAnalyzeIncident(inc.id),
              }}
            >
              <Popup>
                <div className="bg-slate-900/90 text-white rounded-xl p-3 border border-slate-700/50 shadow-xl space-y-1 min-w-[150px]">
                  <strong className="text-white text-xs block leading-tight">{inc.title}</strong>
                  <div className="text-[10px] text-slate-400">Severity: <span className="font-bold text-red-400">{inc.severity}</span></div>
                  {onAnalyzeIncident && (
                    <button 
                      onClick={() => onAnalyzeIncident(inc.id)} 
                      className="mt-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg w-full font-bold transition-all"
                    >
                      Analyze Incident
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}


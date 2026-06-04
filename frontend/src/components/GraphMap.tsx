'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMapEvents, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Node {
  id: number;
  lat: number;
  lng: number;
  congestion: number; // 0 to 1
}

interface MapProps {
  nodes?: Node[];
  route?: [number, number][]; // Array of [lat, lng]
  onMapClick?: (lat: number, lng: number) => void;
  selectedPoints?: [number, number][];
  incidents?: any[];
  onAnalyzeIncident?: (id: number) => void;
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

export default function GraphMap({ nodes = [], route = [], onMapClick, selectedPoints = [], incidents = [], onAnalyzeIncident }: MapProps) {
  // Fix Leaflet marker icons in Next.js
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

  const getCongestionColor = (level: number) => {
    if (level > 0.7) return '#ef4444'; // Red
    if (level > 0.4) return '#f59e0b'; // Yellow
    return '#22c55e'; // Green
  };

  // Default to Koramangala roughly
  const center: [number, number] = nodes.length > 0 ? [nodes[0].lat, nodes[0].lng] : [12.9345, 77.6265];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <MapContainer
        center={center}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
      >
        <MapInteraction onClick={onMapClick} />
        
        {/* Minimal light tile layer */}
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Draw Graph Nodes */}
        {nodes.map((node) => (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lng]}
            radius={node.congestion > 0.7 ? 5 : 3}
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
        {selectedPoints.map((point, i) => {
          const L = require('leaflet');
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

        {/* Draw Route */}
        {route.length > 0 && (
          <Polyline 
            key={JSON.stringify(route)}
            positions={route} 
            pathOptions={{ color: '#6366f1', weight: 6, opacity: 0.8 }} 
          />
        )}

        {/* Draw Incidents */}
        {incidents.filter(i => i.lat && i.lng && i.status !== 'Resolved').map((inc) => {
          const L = require('leaflet');
          const color = inc.severity === 'Critical' ? '#ef4444' : inc.severity === 'High' ? '#f97316' : '#eab308';
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); animation: pulse 2s infinite;"></div>`,
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
                <strong>{inc.title}</strong><br/>
                Severity: {inc.severity}<br/>
                {onAnalyzeIncident && (
                  <button onClick={() => onAnalyzeIncident(inc.id)} className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                    Analyze Incident
                  </button>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

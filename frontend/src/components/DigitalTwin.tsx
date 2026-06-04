'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface DigitalTwinProps {
  traffic: any[];
  incidents: any[];
  weather: any;
  analysisResult: any;
  onAnalyzeIncident?: (id: number) => void;
}

// Bounding box for mapping lat/lng to 3D space
const minLat = 12.84;
const maxLat = 13.05;
const minLng = 77.55;
const maxLng = 77.76;

const mapTo3D = (lat: number, lng: number) => {
  const x = ((lng - minLng) / (maxLng - minLng) - 0.5) * 12;
  const z = ((lat - minLat) / (maxLat - minLat) - 0.5) * -12;
  return new THREE.Vector3(x, 0, z);
};

// Sub-components
function CityAmbience({ weather }: { weather: any }) {
  const isRaining = weather?.condition === 'Rain';
  return (
    <>
      <ambientLight intensity={isRaining ? 0.3 : 0.8} />
      <directionalLight position={[10, 15, 10]} intensity={isRaining ? 0.5 : 1.5} color={isRaining ? '#88aaff' : '#fff'} />
      <fog attach="fog" args={['#020813', 15, 80]} />
      {isRaining && <Sparkles count={800} scale={15} size={1.5} speed={0.4} opacity={0.3} color="#aaccff" />}
      <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
    </>
  );
}

function TrafficNetwork({ traffic }: { traffic: any[] }) {
  const points = useMemo(() => traffic.map(t => ({ pos: mapTo3D(t.lat, t.lng), cong: t.congestion || 0 })), [traffic]);
  
  const { red, yellow, blue } = useMemo(() => {
    const r: number[] = [], y: number[] = [], b: number[] = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (points[i].pos.distanceTo(points[j].pos) < 1.5) {
          const arr = points[i].cong > 0.7 ? r : points[i].cong > 0.4 ? y : b;
          arr.push(points[i].pos.x, points[i].pos.y, points[i].pos.z);
          arr.push(points[j].pos.x, points[j].pos.y, points[j].pos.z);
        }
      }
    }
    return { red: new Float32Array(r), yellow: new Float32Array(y), blue: new Float32Array(b) };
  }, [points]);

  return (
    <group>
      {red.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={red.length / 3} array={red} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#ef4444" transparent opacity={0.3} />
        </lineSegments>
      )}
      {yellow.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={yellow.length / 3} array={yellow} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#f59e0b" transparent opacity={0.3} />
        </lineSegments>
      )}
      {blue.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={blue.length / 3} array={blue} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#3b82f6" transparent opacity={0.3} />
        </lineSegments>
      )}
      
      {points.map((p, i) => {
        const color = p.cong > 0.7 ? '#ef4444' : p.cong > 0.4 ? '#f59e0b' : '#3b82f6';
        return (
          <mesh key={i} position={p.pos}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}

function TrafficParticles({ traffic }: { traffic: any[] }) {
  const count = 300;
  const mesh = useRef<THREE.InstancedMesh>(null);
  
  const points = useMemo(() => traffic.map(t => ({ pos: mapTo3D(t.lat, t.lng), cong: t.congestion || 0 })), [traffic]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Create particle paths based on points
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => {
      const idx1 = Math.floor(Math.random() * points.length);
      let idx2 = Math.floor(Math.random() * points.length);
      while (idx2 === idx1 && points.length > 1) idx2 = Math.floor(Math.random() * points.length);
      
      return {
        start: points[idx1]?.pos || new THREE.Vector3(),
        end: points[idx2]?.pos || new THREE.Vector3(),
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.003,
        cong: points[idx1]?.cong || 0
      };
    });
  }, [points]);

  useFrame(() => {
    if (!mesh.current) return;
    particles.forEach((p, i) => {
      // If congestion is high, speed is slower
      const currentSpeed = p.cong > 0.7 ? p.speed * 0.3 : p.cong > 0.4 ? p.speed * 0.7 : p.speed;
      p.progress += currentSpeed;
      if (p.progress > 1) {
        p.progress = 0;
        // Optionally pick new random nodes, but loop is fine for now
      }
      
      dummy.position.lerpVectors(p.start, p.end, p.progress);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
      
      const c = p.cong > 0.7 ? new THREE.Color('#ef4444') : p.cong > 0.4 ? new THREE.Color('#f59e0b') : new THREE.Color('#60a5fa');
      mesh.current!.setColorAt(i, c);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.04, 0.04, 0.1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Incidents({ incidents, onAnalyzeIncident }: { incidents: any[], onAnalyzeIncident?: (id: number) => void }) {
  return (
    <group>
      {incidents.filter(i => i.lat && i.lng && i.status !== 'Resolved').map((inc, i) => {
        const pos = mapTo3D(inc.lat, inc.lng);
        return (
          <IncidentPulse key={i} position={pos} incident={inc} onClick={() => onAnalyzeIncident?.(inc.id)} />
        );
      })}
    </group>
  );
}

function IncidentPulse({ position, incident, onClick }: { position: THREE.Vector3, incident: any, onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const color = incident.severity === 'Critical' ? '#ef4444' : incident.severity === 'High' ? '#f97316' : '#eab308';
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.2);
    }
    if (ringRef.current) {
      const s = (t * 2) % 3;
      ringRef.current.scale.setScalar(s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - s / 3);
    }
  });

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Click target slightly larger */}
      <mesh visible={false}><sphereGeometry args={[0.5]} /><meshBasicMaterial /></mesh>
      
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Tall beacon beam */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.02, 0.05, 3, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function AIWaves({ analysisResult, traffic }: { analysisResult: any, traffic: any[] }) {
  // If analysisResult is active, show pulsing blue waves covering the network
  const waveRef = useRef<THREE.Mesh>(null);
  const incNode = traffic.find(t => t.id === analysisResult?.id); // We don't have id in analysis, but we know it's there
  
  useFrame((state) => {
    if (waveRef.current && analysisResult) {
      const t = state.clock.elapsedTime;
      const s = (t * 3) % 8;
      waveRef.current.scale.setScalar(s);
      const mat = waveRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - s / 8) * 0.6);
    }
  });

  if (!analysisResult) return null;
  // Fallback to center if we don't know the incident location exactly
  const pos = new THREE.Vector3(0, 0, 0); 
  
  return (
    <mesh ref={waveRef} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.1, 0.5, 64]} />
      <meshBasicMaterial color="#a855f7" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export default function DigitalTwin({ traffic, incidents, weather, analysisResult, onAnalyzeIncident }: DigitalTwinProps) {
  return (
    <div className="w-full h-full relative bg-[#020813] overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
      <Canvas camera={{ position: [0, 8, 8], fov: 45 }}>
        <color attach="background" args={['#020813']} />
        <CityAmbience weather={weather} />
        
        <group position={[0, -0.5, 0]}>
          {/* Base Grid Plane representing the city ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <planeGeometry args={[25, 25, 25, 25]} />
            <meshBasicMaterial color="#1e3a8a" wireframe transparent opacity={0.4} />
          </mesh>
          
          <TrafficNetwork traffic={traffic} />
          {traffic.length > 0 && <TrafficParticles traffic={traffic} />}
          <Incidents incidents={incidents} onAnalyzeIncident={onAnalyzeIncident} />
          <AIWaves analysisResult={analysisResult} traffic={traffic} />
        </group>
        
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          maxPolarAngle={Math.PI / 2.2} // Prevent viewing from below ground
          minPolarAngle={Math.PI / 6} // Prevent top-down absolute
          minDistance={3}
          maxDistance={20}
          target={[0, 0, 0]} 
          autoRotate={!analysisResult}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      
      {/* Overlay UI elements */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <h2 className="text-white font-black text-lg tracking-wide drop-shadow-md flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          LIVING BENGALURU
        </h2>
        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1 opacity-80">Urban Intelligence Engine</p>
      </div>
      
      <div className="absolute bottom-4 left-4 pointer-events-none flex gap-4">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-blue-500"/> <span className="text-[10px] text-slate-300 font-bold uppercase">Smooth</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500"/> <span className="text-[10px] text-slate-300 font-bold uppercase">Moderate</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-red-500"/> <span className="text-[10px] text-slate-300 font-bold uppercase">Critical</span></div>
      </div>
      
      {analysisResult && (
        <div className="absolute top-4 right-4 bg-purple-900/60 backdrop-blur-md border border-purple-500/50 rounded-lg p-2.5 max-w-[200px]">
          <p className="text-[9px] text-purple-300 font-bold uppercase tracking-widest mb-1 animate-pulse">Intelligence Active</p>
          <p className="text-xs text-white font-semibold">Graph Neural Network analyzing impact propagation...</p>
        </div>
      )}
    </div>
  );
}

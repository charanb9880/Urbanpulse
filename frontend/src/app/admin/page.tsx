'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Users,
  AlertTriangle,
  Shield,
  Activity,
  Siren,
  Sliders,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AdminPortal() {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showIncidentsModal, setShowIncidentsModal] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);

  const handleOpenUsers = async () => {
    setShowUsersModal(true);
    setLoadingModal(true);
    try {
      const data = await api.getAdminUsers();
      setUsersList(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleOpenIncidents = async () => {
    setShowIncidentsModal(true);
    setLoadingModal(true);
    try {
      const data = await api.getIncidents();
      setIncidentsList(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-6 py-6 flex items-center justify-between border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <Link href="/">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-xs text-slate-500">UrbanPulse AI</p>
            </div>
          </div>
        </Link>
      </header>

      <main className="px-6 py-8 max-w-7xl mx-auto border-t border-slate-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-bold mb-2 text-slate-900">Platform Administration</h1>
          <p className="text-slate-600">Manage users, incidents, and system settings</p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Users', count: '1,247', icon: Users, color: 'text-blue-600' },
            { title: 'Active Incidents', count: '34', icon: AlertTriangle, color: 'text-yellow-600' },
            { title: 'Verified Reports', count: '8,247', icon: Shield, color: 'text-green-600' },
            { title: 'System Status', count: 'Healthy', icon: Activity, color: 'text-emerald-600' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm"
              >
                <div className={`w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 ${item.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-3xl font-bold mb-1 text-slate-900">{item.count}</p>
                <p className="text-slate-600">{item.title}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-900">User Management</h2>
              <p className="text-slate-600 mb-6">Manage user accounts and permissions</p>
            </div>
            <button 
              onClick={handleOpenUsers}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors mt-auto"
            >
              View All Users
            </button>
          </div>
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-900">Incident Moderation</h2>
              <p className="text-slate-600 mb-6">Review and verify reported incidents</p>
            </div>
            <button 
              onClick={handleOpenIncidents}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors mt-auto"
            >
              Review Incidents
            </button>
          </div>
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-900 flex items-center gap-2">
                <Siren className="w-6 h-6 text-rose-600" />
                Emergency Command
              </h2>
              <p className="text-slate-600 mb-6">Coordinate emergency services and track Golden Hour optimizer metrics</p>
            </div>
            <Link href="/emergency-command" className="w-full">
              <button className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition-colors mt-auto">
                Launch Control Center
              </button>
            </Link>
          </div>
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-900 flex items-center gap-2">
                <Sliders className="w-6 h-6 text-indigo-600" />
                Urban Decision Sim
              </h2>
              <p className="text-slate-600 mb-6">Simulate and evaluate planned city actions before implementation</p>
            </div>
            <Link href="/uds" className="w-full">
              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors mt-auto">
                Launch Simulator
              </button>
            </Link>
          </div>
        </div>
      </main>

      {/* ── USER MANAGEMENT MODAL ── */}
      <AnimatePresence>
        {showUsersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">User Directory</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage and view system-wide user credentials</p>
                </div>
                <button onClick={() => setShowUsersModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                {loadingModal ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm text-slate-500">Querying DB records...</p>
                  </div>
                ) : usersList.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No users found in database.</p>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                        {usersList.map((user, idx) => (
                          <tr key={user.id || idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-slate-400">#{user.id}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{user.name}</td>
                            <td className="px-6 py-4">{user.email}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                user.role === 'authority' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500">{user.phone || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button onClick={() => setShowUsersModal(false)} className="px-6 py-2.5 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── INCIDENT MODERATION MODAL ── */}
      <AnimatePresence>
        {showIncidentsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Incident Moderation Queue</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Review, verify, and monitor reported urban disruptions</p>
                </div>
                <button onClick={() => setShowIncidentsModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                {loadingModal ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm text-slate-500">Querying DB records...</p>
                  </div>
                ) : incidentsList.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No active incidents reported.</p>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Title / Description</th>
                          <th className="px-6 py-4">Location</th>
                          <th className="px-6 py-4">Severity</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                        {incidentsList.map((inc, idx) => (
                          <tr key={inc.id || idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-slate-400">#{inc.id}</td>
                            <td className="px-6 py-4">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                {inc.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <p className="font-bold text-slate-900">{inc.title}</p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{inc.description}</p>
                            </td>
                            <td className="px-6 py-4">{inc.location}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                inc.severity === 'Critical' ? 'bg-red-50 text-red-600' :
                                inc.severity === 'High' ? 'bg-orange-50 text-orange-600' :
                                inc.severity === 'Medium' ? 'bg-amber-50 text-amber-600' :
                                'bg-green-50 text-green-600'
                              }`}>
                                {inc.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                inc.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                inc.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                                {inc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button onClick={() => setShowIncidentsModal(false)} className="px-6 py-2.5 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

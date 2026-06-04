'use client';

import { motion } from 'framer-motion';
import {
  Settings,
  Users,
  AlertTriangle,
  Shield,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPortal() {
  return (
    <div className="min-h-screen">
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

      <main className="px-6 py-8 max-w-6xl mx-auto">
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

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">User Management</h2>
            <p className="text-slate-600 mb-4">Manage user accounts and permissions</p>
            <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              View All Users
            </button>
          </div>
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Incident Moderation</h2>
            <p className="text-slate-600 mb-4">Review and verify reported incidents</p>
            <button className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">
              Review Incidents
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

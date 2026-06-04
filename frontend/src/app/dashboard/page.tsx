"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Map,
  AlertTriangle,
  Plus,
  Bell,
  User,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Brain,
  Droplets,
  Car,
  Activity,
  Thermometer,
  Wind,
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("feed");

  // Mock data
  const incidents = [
    {
      id: 1,
      title: "Accident near Silk Board",
      category: "Accident",
      location: "Silk Board Junction",
      severity: "High",
      status: "Active",
      time: "10 min ago",
      verified: true,
    },
    {
      id: 2,
      title: "Flooding in Whitefield",
      category: "Flood",
      location: "Whitefield Main Road",
      severity: "Medium",
      status: "Investigating",
      time: "25 min ago",
      verified: true,
    },
    {
      id: 3,
      title: "Large pothole on Hebbal Flyover",
      category: "Pothole",
      location: "Hebbal Flyover",
      severity: "Low",
      status: "Reported",
      time: "1 hour ago",
      verified: false,
    },
  ];

  const activityFeed = [
    {
      id: 1,
      type: "report",
      text: "New accident reported near Silk Board",
      time: "10 min ago",
      icon: AlertTriangle,
      color: "text-red-400",
    },
    {
      id: 2,
      type: "resolve",
      text: "Authorities resolved road damage in Indiranagar",
      time: "30 min ago",
      icon: CheckCircle2,
      color: "text-green-400",
    },
    {
      id: 3,
      type: "verify",
      text: "Flood report in Whitefield has been verified",
      time: "45 min ago",
      icon: CheckCircle2,
      color: "text-blue-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight hidden sm:block">
                  UrbanPulse AI
                </span>
              </Link>
            </div>

            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/50 border border-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 rounded-xl hover:bg-slate-800 transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
              </button>
              <button className="p-2 rounded-xl hover:bg-slate-800 transition-colors">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <button
                onClick={() => setActiveTab("feed")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "feed"
                  ? "bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-primary-500"
                  : "hover:bg-slate-800/50"
              }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">City Feed</span>
              </button>

              <button
                onClick={() => setActiveTab("map")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "map"
                  ? "bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-primary-500"
                  : "hover:bg-slate-800/50"
              }`}
              >
                <Map className="w-5 h-5" />
                <span className="font-medium">Map View</span>
              </button>

              <button
                onClick={() => setActiveTab("incidents")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "incidents"
                  ? "bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-primary-500"
                  : "hover:bg-slate-800/50"
              }`}
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">My Reports</span>
              </button>

              <Link href="/dashboard/report" className="w-full">
                <button className="w-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all">
                  <Plus className="w-5 h-5" />
                  Report Incident
                </button>
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* City Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Current Bengaluru Status</h2>
                  <p className="text-slate-400 mt-1">Real-time city intelligence</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-green-400 font-medium">City Pulse: Stable</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <Thermometer className="w-5 h-5" />
                    <span className="text-sm">Weather</span>
                  </div>
                  <div className="text-2xl font-bold">28°C</div>
                  <div className="text-sm text-slate-500">Partly Cloudy</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm">Active Incidents</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">12</div>
                  <div className="text-sm text-slate-500">3 High Priority</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm">Verified Reports</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">156</div>
                  <div className="text-sm text-slate-500">This week</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <Wind className="w-5 h-5" />
                    <span className="text-sm">AQI</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">142</div>
                  <div className="text-sm text-slate-500">Moderate</div>
                </div>
              </div>
            </motion.div>

            {activeTab === "feed" && (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Activity Feed */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    City Activity Feed
                  </h3>
                  {activityFeed.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg bg-slate-900/50 ${item.color}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.text}</p>
                          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* AI Insights */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Insights
                  </h3>
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      Flood Risk Alert
                    </h4>
                    <p className="text-sm text-slate-400">
                      High chance of flooding in low-lying areas of Koramangala in next 2 hours.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <h4 className="font-semibold mb-2">Hotspots</h4>
                    <ul className="space-y-2 text-sm text-slate-400">
                      <li className="flex items-center justify-between">
                        <span>Silk Board</span>
                        <span className="text-red-400">High</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Hebbal</span>
                        <span className="text-yellow-400">Medium</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>MG Road</span>
                        <span className="text-green-400">Low</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "incidents" && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Recent Incidents</h3>
                {incidents.map((incident, idx) => (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{incident.title}</h4>
                          {incident.verified && (
                            <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            incident.severity === "High"
                              ? "bg-red-500/20 text-red-400"
                              : incident.severity === "Medium"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                          }`}>
                            {incident.severity}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400">
                            {incident.category}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{incident.location}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {incident.time}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === "map" && (
              <div className="p-12 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-xl text-center">
                <Map className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                <h3 className="text-xl font-bold mb-2">Interactive Map</h3>
                <p className="text-slate-400">Map integration coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

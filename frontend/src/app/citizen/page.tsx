'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Camera,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api';

interface Incident {
  id: number;
  title: string;
  status: string;
  location?: string;
  description?: string;
  created_at: string;
  ai_analysis?: any;
}

function CitizenContent() {
  const [isReporting, setIsReporting] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [reportData, setReportData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    severity: 'Medium',
    image_url: ''
  });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [nearby, setNearby] = useState<Incident[]>([]);
  const [view, setView] = useState<'reports'|'nearby'>('reports');
  const [error, setError] = useState('');
  const { logout } = useAuth();

  useEffect(() => {
    loadIncidents();
    loadNearby();
  }, []);

  const loadNearby = async () => {
    try {
      // Mock citizen location to Bengaluru center
      const data = await api.getNearbyIncidents(12.9716, 77.5946, 10);
      setNearby(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportData({ ...reportData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    if (reportStep === 3) {
      submitReport();
    } else {
      setReportStep(reportStep + 1);
    }
  };

  const submitReport = async () => {
    try {
      await api.createIncident(reportData);
      setIsReporting(false);
      setReportStep(1);
      setReportData({
        title: '',
        description: '',
        category: '',
        location: '',
        severity: 'Medium',
        image_url: ''
      });
      loadIncidents();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    }
  };

  const categories = [
    'Accident', 'Flood', 'Pothole', 'Road Damage', 'Traffic Blockage', 'Fallen Tree', 'Infrastructure Failure'
  ];

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-slate-50 to-slate-200">
      <header className="px-6 py-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            <span className="text-xl font-bold text-slate-900">UrbanPulse</span>
          </div>
        </Link>
        <button onClick={logout} className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
          <LogOut className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Logout</span>
        </button>
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto">
        {!isReporting ? (
          <>
            <div className="mb-10">
              <h1 className="text-4xl font-bold mb-2 text-slate-900">Hi there! 👋</h1>
              <p className="text-lg text-slate-600">Help make Bengaluru better</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <button
                onClick={() => setIsReporting(true)}
                className="bg-white border border-slate-200 p-6 rounded-3xl text-left shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-1 text-slate-900">Report Incident</h3>
                <p className="text-sm text-slate-600">Quick & easy</p>
              </button>
              <button 
                onClick={() => setView('nearby')}
                className={`bg-white border p-6 rounded-3xl text-left shadow-sm hover:shadow-md transition-all ${view === 'nearby' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-1 text-slate-900">Nearby Issues</h3>
                <p className="text-sm text-slate-600">Verify reports around you</p>
              </button>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">{view === 'reports' ? 'My Reports' : 'Community Verification'}</h2>
              <button onClick={() => setView(view === 'reports' ? 'nearby' : 'reports')} className="text-blue-600 font-semibold text-sm">
                {view === 'reports' ? 'View Nearby' : 'View My Reports'}
              </button>
            </div>

            <div className="space-y-4">
              {view === 'reports' && incidents.length === 0 ? (
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                  <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No reports yet. Be the first to report an issue!</p>
                </div>
              ) : view === 'reports' ? (
                incidents.map((incident) => {
                  const steps = ["Reported", "AI Verified", "Under Review", "Action Initiated", "Resolved"];
                  const currentIndex = steps.indexOf(incident.status) === -1 ? (incident.status === 'Closed' ? 5 : 0) : steps.indexOf(incident.status);
                  
                  return (
                  <div key={incident.id} className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col gap-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          currentIndex >= 4 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {currentIndex >= 4 ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-900">{incident.title}</h3>
                          <p className="text-sm text-slate-500">{new Date(incident.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {incident.ai_analysis?.priority && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${incident.ai_analysis.priority === 'Critical' ? 'bg-red-100 text-red-700' : incident.ai_analysis.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                          {incident.ai_analysis.priority} Priority
                        </span>
                      )}
                    </div>
                    
                    {/* Status Tracker */}
                    <div className="mt-2">
                      <div className="flex justify-between mb-2">
                        {steps.map((s, i) => (
                          <span key={s} className={`text-[10px] sm:text-xs font-semibold ${i <= currentIndex ? 'text-blue-600' : 'text-slate-400'}`}>{s}</span>
                        ))}
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        {steps.map((s, i) => (
                          <div key={s} className={`h-full flex-1 border-r border-white/50 last:border-0 ${i <= currentIndex ? 'bg-blue-500' : 'bg-transparent'}`} />
                        ))}
                      </div>
                    </div>

                    {currentIndex >= 4 && (
                      <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
                        <h4 className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Impact Achieved</h4>
                        <p className="text-sm mt-1">Your report was crucial. Traffic impact mitigated in {incident.location}. Thank you for contributing to urban intelligence!</p>
                      </div>
                    )}
                  </div>
                )})
              ) : null}

              {view === 'nearby' && nearby.length === 0 ? (
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                  <p className="text-slate-600">No active incidents reported near you.</p>
                </div>
              ) : view === 'nearby' ? (
                nearby.map((incident) => (
                  <div key={incident.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{incident.title}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {incident.location}</p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">Reported {new Date(incident.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 mb-4">{incident.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { api.communityVerifyIncident(incident.id, 'Confirm'); loadNearby(); }} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-semibold transition-colors">👍 Confirm Present</button>
                      <button onClick={() => { api.communityVerifyIncident(incident.id, 'Outdated'); loadNearby(); }} className="px-3 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold transition-colors">❌ Outdated / Cleared</button>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </>
        ) : (
          <ReportFlow
            step={reportStep}
            data={reportData}
            setData={setReportData}
            onNext={nextStep}
            onClose={() => setIsReporting(false)}
            handleImageUpload={handleImageUpload}
            categories={categories}
            error={error}
          />
        )}
      </main>
    </div>
  );
}

function ReportFlow({
  step,
  data,
  setData,
  onNext,
  onClose,
  handleImageUpload,
  categories,
  error
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <button
        onClick={onClose}
        className="absolute -top-2 right-0 p-2"
      >
        <X className="w-6 h-6 text-slate-500" />
      </button>

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold mb-2 text-slate-900">What happened?</h2>
          <p className="text-slate-600">Describe the incident</p>

          <input
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-lg focus:outline-none focus:border-blue-500 shadow-sm"
            placeholder="Title (e.g., Pothole on MG Road)"
          />
          <textarea
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl h-32 resize-none focus:outline-none focus:border-blue-500 shadow-sm"
            placeholder="Add more details..."
          />

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={onNext}
            disabled={!data.title}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
          >
            Next: Add location
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold mb-2 text-slate-900">Where is this?</h2>
          <p className="text-slate-600">Select category & location</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {categories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setData({ ...data, category: cat })}
                className={`py-3 px-4 bg-white border rounded-xl text-left transition-all ${
                  data.category === cat
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 hover:border-blue-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-700 mb-2">Location</label>
            <input
              type="text"
              value={data.location}
              onChange={(e) => setData({ ...data, location: e.target.value })}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 shadow-sm"
              placeholder="e.g., Silk Board Junction"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                if (!navigator.geolocation) {
                  setData({ ...data, location: 'Geolocation not supported' });
                  return;
                }
                setData({ ...data, location: 'Locating...' });
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                      const geoData = await res.json();
                      if (geoData && geoData.address) {
                        const addr = geoData.address;
                        const shortAddr = addr.suburb || addr.neighbourhood || addr.road || geoData.display_name.split(',')[0];
                        const city = addr.city || addr.town || addr.county || '';
                        setData({ ...data, location: `${shortAddr}${city ? ', ' + city : ''}` });
                      } else {
                        setData({ ...data, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
                      }
                    } catch (err) {
                      setData({ ...data, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
                    }
                  },
                  (error) => {
                    setData({ ...data, location: 'Location access denied' });
                  }
                );
              }}
              className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-semibold text-lg text-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              Use Current Location
            </button>
            <button
              onClick={onNext}
              disabled={!data.category || !data.location}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
            >
              Next: Add photo
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold mb-2 text-slate-900">Add a photo</h2>
          <p className="text-slate-600">Visual evidence helps AI analyze faster</p>

          {!data.image_url ? (
            <label className="block w-full aspect-video bg-white border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 shadow-sm">
              <Camera className="w-16 h-16 text-slate-400 mb-3" />
              <p className="text-lg font-semibold text-slate-700">Tap to add photo</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="relative">
              <img src={data.image_url} alt="Preview" className="w-full aspect-video object-cover rounded-3xl border border-slate-200 shadow-sm" />
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setData({ ...data, image_url: '' })}
              className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-semibold text-lg text-slate-800 shadow-sm hover:shadow-md transition-all"
            >
              Skip
            </button>
            <button
              onClick={onNext}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Submit Report
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-slate-900">Report Submitted!</h2>
          <p className="text-slate-600 mb-8">Thanks for helping make Bengaluru better</p>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function CitizenPage() {
  return (
    <ProtectedRoute requiredRole="citizen">
      <CitizenContent />
    </ProtectedRoute>
  );
}

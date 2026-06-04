'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function AuthInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, signup, isAuthenticated } = useAuth();
  const roleFromUrl = searchParams.get('role');
  const [selectedRole, setSelectedRole] = useState(roleFromUrl || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'citizen', label: 'Citizen', icon: User, desc: 'Report issues, track your city, and get alerts' },
    { id: 'authority', label: 'Authority', icon: ShieldAlert, desc: 'Command center for operations, analytics & simulation' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await signup(name, email, password, selectedRole);
      } else {
        await login(email, password);
      }
      
      const userRole = selectedRole || 'citizen';
      
      // Allow React context state to propagate before navigation
      setTimeout(() => {
        router.push(`/${userRole}`);
      }, 100);
      
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-200">
      <Link href="/" className="self-start mb-8">
        <ArrowLeft className="w-6 h-6 text-slate-600" />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h1 className="text-4xl font-bold mb-2 text-slate-900">Choose Your Role</h1>
        <p className="text-slate-600 mb-8">Select how you'll use UrbanPulse AI</p>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`p-6 rounded-2xl text-left transition-all ${
                  selectedRole === role.id
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400 shadow-md'
                    : 'bg-white border-2 border-slate-200 hover:border-blue-300 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      selectedRole === role.id
                        ? 'bg-blue-200 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{role.label}</h3>
                    <p className="text-slate-600 text-sm">{role.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedRole && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 p-8 rounded-3xl shadow-md"
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-slate-600">
                {isSignup ? "Already have an account?" : "Don't have an account?"}
              </span>
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-blue-600 font-semibold hover:text-blue-700"
              >
                {isSignup ? "Login" : "Sign Up"}
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {isSignup && (
                <div>
                  <label className="block text-sm text-slate-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    placeholder="Your name"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-700 mb-2">Email or Role</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="e.g. citizen or you@urbanpulse.ai"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? "Please wait..." : (isSignup ? "Create Account" : "Enter Portal")}
            </button>

            <div className="mt-6 text-sm text-slate-600">
              <p className="font-semibold mb-2 text-slate-800">Demo credentials:</p>
              <ul className="space-y-1">
                <li><strong>Citizen:</strong> citizen / citizen123</li>
                <li><strong>Authority:</strong> authority / authority123</li>
              </ul>
            </div>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}

export default function Auth() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">Loading…</p></div>}>
      <AuthInner />
    </Suspense>
  );
}

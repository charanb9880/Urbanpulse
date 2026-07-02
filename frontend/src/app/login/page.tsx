'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Zap,
} from 'lucide-react';
import BrandingPanel from '@/components/BrandingPanel';

type ModeState = 'auth' | 'forgot' | 'otp' | 'reset' | 'success';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Custom Flow States for premium feel
  const [mode, setMode] = useState<ModeState>('auth');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cinematic loading progression state
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Authenticating Identity...",
    "Connecting to UrbanPulse Core...",
    "Synchronizing Mobility Intelligence...",
    "Access Granted."
  ];

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingMessages.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Core Login Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1600));
      
      // Success visual feedback
      setMode('success');
      
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);
      
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Mock/Unwired Social Login Handler
  const handleSocialLogin = (provider: 'google' | 'github') => {
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setMode('success');
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);
    }, 1800);
  };

  // Simulated Forgot Password Handler
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setMode('otp');
    }, 1200);
  };

  // Simulated OTP / Verification Handler
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) {
      setError('Please enter the complete 4-digit code');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setMode('reset');
    }, 1200);
  };

  // Simulated Password Reset Handler
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setMode('success');
    }, 1200);
  };

  // Custom Social Icons
  const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );

  const GithubIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.646.64.699 1.026 1.592 1.026 2.683 0 3.842-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* LEFT SECTION (Branding Experience) - 42% width on desktop */}
      <div className="w-full lg:w-[42%] lg:sticky lg:top-0 lg:h-screen shrink-0">
        <BrandingPanel />
      </div>

      {/* RIGHT SECTION (Authentication Forms) - 58% width on desktop */}
      <div className="w-full lg:w-[58%] flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-slate-50 relative min-h-[600px] lg:min-h-screen">
        <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {/* SUCCESS STATE */}
            {mode === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Success!</h2>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                  Logging in to the UrbanPulse AI dashboard portal...
                </p>
              </motion.div>
            )}

            {/* LOGIN FORM */}
            {mode === 'auth' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href="/"
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center"
                    title="Back to home"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 py-1.5 px-3 rounded-full border border-slate-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Sign In
                  </span>
                </div>

                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
                  <p className="text-slate-500 mt-2">Sign in to your UrbanPulse account to continue.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-950 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all placeholder:text-slate-400"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError('');
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-950 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all placeholder:text-slate-400"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all p-1"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Error Box */}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="animate-pulse">{loadingMessages[loadingStep]}</span>
                      </span>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </form>

                {/* Social Login Separator */}
                <div className="relative flex items-center justify-center my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <span className="relative z-10 px-3 bg-white text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Or continue with
                  </span>
                </div>

                {/* Social Buttons */}
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => handleSocialLogin('google')}
                    className="flex-1 py-3 px-4 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 rounded-2xl flex items-center justify-center font-semibold text-slate-700 text-sm transition-colors"
                  >
                    <GoogleIcon />
                    Google
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSocialLogin('github')}
                    className="flex-1 py-3 px-4 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 rounded-2xl flex items-center justify-center font-semibold text-slate-700 text-sm transition-colors"
                  >
                    <GithubIcon />
                    GitHub
                  </button>
                </div>

                {/* Bottom Toggle switch */}
                <div className="pt-4 text-center border-t border-slate-50 text-sm text-slate-500">
                  <span>Don't have an account? </span>
                  <Link
                    href="/signup"
                    className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              </motion.div>
            )}

            {/* FORGOT PASSWORD STATE */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Back button */}
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setMode('auth');
                      setError('');
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Forgot Password</h2>
                  <p className="text-slate-500 mt-2">
                    Enter the email associated with your account. We will send you a 4-digit code.
                  </p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-950 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all placeholder:text-slate-400"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Code...
                      </span>
                    ) : (
                      <span>Send Code</span>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* OTP VERIFICATION STATE */}
            {mode === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Back button */}
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Security Check</h2>
                  <p className="text-slate-500 mt-2">
                    We have sent a verification code to <span className="font-semibold text-slate-800">{email}</span>. Enter the 4-digit code below.
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="space-y-1.5 text-center">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Verification Code</label>
                    <div className="relative max-w-[200px] mx-auto">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        maxLength={4}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-center font-bold text-xl tracking-[0.75em] text-slate-950 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all placeholder:text-slate-300"
                        placeholder="••••"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      <span>Verify Code</span>
                    )}
                  </button>
                </form>

                <div className="text-center pt-2 text-sm text-slate-500 font-medium">
                  Didn't receive code?{' '}
                  <button 
                    type="button" 
                    onClick={() => {
                      setError('');
                      setOtpCode('');
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-bold"
                  >
                    Resend Code
                  </button>
                </div>
              </motion.div>
            )}

            {/* RESET PASSWORD STATE */}
            {mode === 'reset' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">New Password</h2>
                  <p className="text-slate-500 mt-2">
                    Create a strong, unique password for email <span className="font-semibold text-slate-800">{email}</span>.
                  </p>
                </div>

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-950 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Min 6 characters"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-950 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Re-enter password"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
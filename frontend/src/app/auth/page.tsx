'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  ShieldAlert,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Zap,
  Phone,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import BrandingPanel from '@/components/BrandingPanel';

type ModeState = 'auth' | 'forgot' | 'otp' | 'reset' | 'success';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function AuthInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, loginWithGoogle, signup } = useAuth();
  const roleFromUrl = searchParams.get('role');
  
  const [selectedRole, setSelectedRole] = useState(roleFromUrl || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [mode, setMode] = useState<ModeState>('auth');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDelivery, setOtpDelivery] = useState<{email: boolean; sms: boolean}>({ email: false, sms: false });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Cinematic loading progression state
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Authenticating Identity...",
    "Connecting to UrbanPulse Core...",
    "Synchronizing Mobility Intelligence...",
    "Access Granted."
  ];

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const googleInitializedRef = useRef(false);

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingMessages.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 450);
    return () => clearInterval(interval);
  }, [loading]);

  // Initialize Google Identity Services button
  useEffect(() => {
    if (!selectedRole || mode !== 'auth' || !GOOGLE_CLIENT_ID) return;

    let attempts = 0;
    const maxAttempts = 30; // 3 seconds total

    const checkAndRender = () => {
      attempts++;
      const hasGoogle = !!window.google?.accounts?.id;
      const hasContainer = !!googleBtnRef.current;

      if (hasGoogle && hasContainer) {
        try {
          if (!googleInitializedRef.current) {
            window.google!.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleGoogleCallback,
            });
            googleInitializedRef.current = true;
          }

          if (googleBtnRef.current && googleBtnRef.current.children.length === 0) {
            const btnWidth = googleBtnRef.current.offsetWidth || 320;
            window.google!.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              width: btnWidth,
            });
            console.log("✓ Google Sign-In button rendered successfully");
          }
          return true; // Success, clear interval
        } catch (err) {
          console.error('Error rendering Google button:', err);
        }
      }
      return false; // Keep polling
    };

    // Try immediately
    if (checkAndRender()) return;

    // Otherwise poll
    const interval = setInterval(() => {
      if (checkAndRender() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [selectedRole, mode, GOOGLE_CLIENT_ID]);

  const handleGoogleCallback = async (response: any) => {
    if (!response.credential) return;
    setError('');
    setLoading(true);
    try {
      const data = await loginWithGoogle(response.credential);
      // Use the role returned from backend (default: citizen)
      const role = (data as any)?.role || selectedRole || 'citizen';
      const isNew = (data as any)?.is_new_user;
      if (isNew) {
        setSuccess(`Welcome to UrbanPulse AI! 🎉 Check your inbox for a welcome email.`);
      }
      setMode('success');
      setTimeout(() => router.push(`/${role}`), isNew ? 2000 : 1500);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { 
      id: 'citizen', 
      label: 'Citizen', 
      icon: User, 
      desc: 'Report issues, track your city, and get alerts',
      color: 'from-blue-500/20 to-indigo-500/20 border-indigo-500/30 text-indigo-600'
    },
    { 
      id: 'authority', 
      label: 'Authority', 
      icon: ShieldAlert, 
      desc: 'Command center for operations, analytics & simulation',
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-600'
    },
  ];

  // Core Login & Sign Up Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await signup(name, email, password, selectedRole, phone || undefined);
      } else {
        await login(email, password);
      }
      const userRole = selectedRole || 'citizen';
      setMode('success');
      setTimeout(() => router.push(`/${userRole}`), 1500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Real Forgot Password Handler — sends OTP via email/SMS
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setOtpSent(true);
      setOtpDelivery({ email: res.email_delivered ?? false, sms: res.sms_delivered ?? false });
      
      let msg = `Verification code sent`;
      if (res.email_delivered) msg += ` to ${email}`;
      if (res.sms_delivered) msg += ` and your registered phone`;
      setSuccess(msg + '. Check your inbox or SMS.');
      
      setTimeout(() => { setSuccess(''); setMode('otp'); }, 2000);
    } catch (err: any) {
      const detail = err.message || '';
      if (detail.includes('404')) {
        setError('No account found with that email address.');
      } else {
        setError(detail || 'Failed to send verification code');
      }
    } finally {
      setLoading(false);
    }
  };

  // Real OTP verification Handler
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) { setError('Please enter the complete 4-digit code'); return; }
    setError('');
    setLoading(true);
    try {
      await api.verifyOtp(email, otpCode);
      setMode('reset');
    } catch (err: any) {
      setError('Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Real Password Reset Handler
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await api.resetPassword(email, otpCode, newPassword);
      setMode('success');
      setSelectedRole('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setOtpCode('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setOtpDelivery({ email: res.email_delivered ?? false, sms: res.sms_delivered ?? false });
      setSuccess('New code sent!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to resend code.');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* LEFT SECTION */}
      <div className="w-full lg:w-[42%] lg:sticky lg:top-0 lg:h-screen shrink-0">
        <BrandingPanel />
      </div>

      {/* RIGHT SECTION */}
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
                  {selectedRole 
                    ? `Logging in to the UrbanPulse AI ${selectedRole} command portal...` 
                    : 'Your password has been reset successfully.'}
                </p>
                {!selectedRole && (
                  <button
                    onClick={() => { setMode('auth'); setError(''); }}
                    className="px-8 py-3 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-colors shadow-md"
                  >
                    Return to Login
                  </button>
                )}
              </motion.div>
            )}

            {/* ROLE SELECT STATE */}
            {mode === 'auth' && !selectedRole && (
              <motion.div
                key="role_select"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome to UrbanPulse</h1>
                  <p className="text-slate-500 mt-2">Choose how you'll log in to the urban simulator.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {roles.map((role) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.id}
                        onClick={() => { setSelectedRole(role.id); setError(''); }}
                        className="group p-5 rounded-2xl text-left bg-slate-50 hover:bg-slate-100/50 border border-slate-100 hover:border-indigo-500/30 transition-all flex items-start gap-4 active:scale-[0.99] hover:shadow-sm"
                      >
                        <div className={`p-3.5 rounded-xl bg-white text-slate-700 shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">{role.label}</h3>
                          <p className="text-slate-500 text-sm mt-1 leading-relaxed">{role.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-center pt-2">
                  <Link href="/" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to presentation website
                  </Link>
                </div>
              </motion.div>
            )}

            {/* LOGIN & SIGNUP FORMS */}
            {mode === 'auth' && selectedRole && (
              <motion.div
                key="login_signup"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Top header & Back */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setSelectedRole(''); setError(''); }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                    title="Go back to role selection"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 py-1.5 px-3 rounded-full border border-slate-100 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedRole === 'citizen' ? 'bg-indigo-500' : 'bg-purple-500'}`} />
                    {selectedRole} portal
                  </span>
                </div>

                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {isSignup ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-slate-500 mt-2">
                    {isSignup 
                      ? 'Empower your city by joining the response loop.' 
                      : `Log in as a registered ${selectedRole} to proceed.`}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name field (signup) */}
                  {isSignup && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-950 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all placeholder:text-slate-400"
                          placeholder="Your legal or user name"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      {isSignup ? 'Email Address' : 'Email or Username'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-950 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all placeholder:text-slate-400"
                        placeholder={isSignup ? "you@example.com" : "e.g. citizen or you@urbanpulse.ai"}
                        required
                      />
                    </div>
                  </div>

                  {/* Phone (signup only) */}
                  {isSignup && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Phone Number <span className="text-slate-400 font-normal normal-case">(for SMS alerts)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm text-slate-950 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all placeholder:text-slate-400"
                          placeholder="+91 9876543210"
                        />
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                      {!isSignup && (
                        <button
                          type="button"
                          onClick={() => { setMode('forgot'); setError(''); }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
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

                  {/* Error */}
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

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="animate-pulse">{loadingMessages[loadingStep]}</span>
                      </span>
                    ) : (
                      <span>{isSignup ? 'Create Account' : 'Enter Portal'}</span>
                    )}
                  </button>
                </form>

                {/* Google OAuth separator */}
                <div className="relative flex items-center justify-center my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <span className="relative z-10 px-3 bg-white text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Or continue with
                  </span>
                </div>

                {/* Google Identity Services button */}
                {GOOGLE_CLIENT_ID ? (
                  <div ref={googleBtnRef} className="w-full flex justify-center" id="google-signin-btn" />
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Set <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in frontend <code>.env.local</code> to enable Google Sign-In.</span>
                  </div>
                )}

                {/* Toggle */}
                <div className="pt-4 text-center border-t border-slate-50 text-sm text-slate-500">
                  <span>
                    {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setIsSignup(!isSignup); setError(''); }}
                    className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    {isSignup ? 'Login' : 'Sign Up'}
                  </button>
                </div>

                {/* Demo Credentials */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/40 text-xs leading-relaxed text-indigo-800">
                  <p className="font-bold text-indigo-900 mb-1 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-indigo-400 text-indigo-500" /> 
                    Demo credentials
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-indigo-900/80">
                    <li><strong>Citizen:</strong> email: <code className="bg-indigo-100 px-1 rounded">citizen</code> / password: <code className="bg-indigo-100 px-1 rounded">citizen123</code></li>
                    <li><strong>Authority:</strong> email: <code className="bg-indigo-100 px-1 rounded">authority</code> / password: <code className="bg-indigo-100 px-1 rounded">authority123</code></li>
                  </ul>
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
                <div className="flex items-center">
                  <button
                    onClick={() => { setMode('auth'); setError(''); setSuccess(''); }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Forgot Password</h2>
                  <p className="text-slate-500 mt-2">
                    Enter your registered email. We will send a 4-digit code to your email and phone (if registered).
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

                  {success && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
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
                <div className="flex items-center">
                  <button
                    onClick={() => { setMode('forgot'); setError(''); }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Security Check</h2>
                  <p className="text-slate-500 mt-2">
                    We sent a 4-digit code to <span className="font-semibold text-slate-800">{email}</span>
                    {otpDelivery.sms && <span> and your registered phone</span>}.
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

                  {success && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
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
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-indigo-600 hover:text-indigo-700 font-bold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
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
                    Create a strong, unique password for <span className="font-semibold text-slate-800">{email}</span>.
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
                    disabled={loading}
                    className="w-full mt-4 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
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

export default function Auth() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-indigo-400 font-bold tracking-widest text-xs uppercase animate-pulse">Initializing Interface...</p>
        </div>
      </div>
    }>
      <AuthInner />
    </Suspense>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { getOrCreateUserProfile } from '../lib/dbHelpers';
import { Mail, UserPlus, KeyRound, ArrowLeft, Loader2, AlertCircle, MailCheck, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  onBack: () => void;
  onAuthSuccess: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthPage({ onBack, onAuthSuccess, addToast, initialMode = 'signin' }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authErrorAlert, setAuthErrorAlert] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  // Forgot password flow
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { addToast('Please enter your email address.', 'error'); return; }
    setIsForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setResetEmailSent(true);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Could not send reset email. Please try again.', 'error');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Admin-reserved emails must only be provisioned via the Supabase dashboard, not the signup form
  const ADMIN_EMAILS = ['cryptogangstar247@gmail.com'];
  const isAdminEmail = (e: string) => ADMIN_EMAILS.includes(e.toLowerCase().trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorAlert(null);
    if (!email || !password) { addToast('Please fill in all fields', 'error'); return; }
    if (!isLogin && password !== confirmPassword) { addToast('Passwords do not match', 'error'); return; }
    if (password.length < 6) { addToast('Password must be at least 6 characters', 'error'); return; }

    // Block admin emails from registering via the public signup form
    if (!isLogin && isAdminEmail(email)) {
      addToast('Admin accounts are provisioned by the platform. Please sign in or contact support.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const profile = await getOrCreateUserProfile(data.user.id, data.user.email || '');
        if (profile.accountStatus === 'terminated') {
          await supabase.auth.signOut();
          const reason = profile.terminateReason ? ` Reason: ${profile.terminateReason}` : '';
          setAuthErrorAlert(`Your account has been permanently terminated by the platform.${reason} Contact support for assistance.`);
          return;
        }
        addToast('Sign in successful!', 'success');
        onAuthSuccess();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          // Email confirmation is disabled in Supabase — user is immediately active
          await getOrCreateUserProfile(data.user!.id, data.user!.email || '');
          addToast('Account created successfully!', 'success');
          onAuthSuccess();
        } else if (data.user) {
          // Email confirmation required — show pending screen, don't navigate
          setVerificationEmail(email);
          setVerificationPending(true);
        } else {
          addToast('Something went wrong. Please try again.', 'error');
        }
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Authentication failed. Please check your details.';
      if (err.message?.includes('Invalid login credentials')) msg = 'Invalid email or password.';
      else if (err.message?.includes('already registered') || err.message?.includes('already been registered')) msg = 'Email already registered. Please sign in.';
      else if (err.message?.includes('valid email')) msg = 'Please enter a valid email address.';
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  // ── Reset email sent screen ──────────────────────────────────────────────
  if (resetEmailSent) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] flex flex-col justify-center py-10 px-4 font-sans text-[#1A1A1A]">
        <motion.div
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="bg-white py-10 px-6 sm:px-10 shadow-sm rounded-3xl border border-[#E0E7E0] text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#E6F4EA] border border-[#C5DFC9] flex items-center justify-center">
                <MailCheck className="w-8 h-8 text-[#008751]" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#1A1A1A]">Check your inbox</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                We sent a password reset link to{' '}
                <span className="font-semibold text-[#1A1A1A]">{forgotEmail}</span>.
                Click the link in that email to set a new password — it expires in 1 hour.
              </p>
            </div>
            <div className="pt-2 space-y-3">
              <button
                onClick={() => { setResetEmailSent(false); setForgotMode(false); setPassword(''); }}
                className="w-full py-3 rounded-xl bg-[#008751] hover:bg-[#007043] text-white font-bold text-sm transition cursor-pointer"
              >
                Back to Sign In
              </button>
              <button
                onClick={() => { setResetEmailSent(false); setForgotEmail(''); }}
                className="w-full py-3 rounded-xl border border-[#E0E7E0] text-gray-500 hover:text-[#008751] font-semibold text-sm transition cursor-pointer"
              >
                Try a different email
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Forgot password screen ────────────────────────────────────────────────
  if (forgotMode) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] flex flex-col justify-center py-10 px-4 font-sans text-[#1A1A1A]">
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
          <button
            onClick={() => { setForgotMode(false); setForgotEmail(''); }}
            className="flex items-center gap-2 text-gray-500 hover:text-[#008751] font-semibold cursor-pointer transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>

        <motion.div
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex justify-center mb-6">
            <motion.img
              src="/logo-icon.png"
              alt="9ija Escrow"
              className="h-16 w-auto"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Enter your account email and we'll send you a reset link.
          </p>

          <div className="mt-6 bg-white py-8 px-5 sm:px-8 shadow-sm rounded-3xl border border-[#E0E7E0]">
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isForgotLoading}
                className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#008751] hover:bg-[#007043] disabled:opacity-50 cursor-pointer transition-colors"
              >
                {isForgotLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Email verification pending screen ────────────────────────────────────
  if (verificationPending) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] flex flex-col justify-center py-10 px-4 font-sans text-[#1A1A1A]">
        <motion.div
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="bg-white py-10 px-6 sm:px-10 shadow-sm rounded-3xl border border-[#E0E7E0] text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#E6F4EA] border border-[#C5DFC9] flex items-center justify-center">
                <MailCheck className="w-8 h-8 text-[#008751]" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#1A1A1A]">Check your email</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                We sent a verification link to{' '}
                <span className="font-semibold text-[#1A1A1A]">{verificationEmail}</span>.
                Click the link to activate your account, then come back and sign in.
              </p>
            </div>
            <div className="pt-2 space-y-3">
              <button
                onClick={() => { setVerificationPending(false); setIsLogin(true); setPassword(''); setConfirmPassword(''); }}
                className="w-full py-3 rounded-xl bg-[#008751] hover:bg-[#007043] text-white font-bold text-sm transition cursor-pointer"
              >
                Back to Sign In
              </button>
              <button
                onClick={onBack}
                className="w-full py-3 rounded-xl border border-[#E0E7E0] text-gray-500 hover:text-[#008751] font-semibold text-sm transition cursor-pointer"
              >
                Go to Home
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9F7] flex flex-col justify-center py-10 px-4 font-sans text-[#1A1A1A]">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-[#008751] font-semibold cursor-pointer transition text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <motion.div
        className="w-full max-w-md mx-auto"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex justify-center mb-6">
          <motion.img
            src="/logo-icon.png"
            alt="9ija Escrow"
            className="h-16 w-auto"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
          {isLogin ? 'Sign in to 9ija Escrow' : 'Create a Trader Account'}
        </h2>
        
        <p className="mt-2 text-center text-sm text-gray-500">
          Or{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setPassword(''); setConfirmPassword(''); }}
            className="font-bold text-[#008751] hover:text-[#007043] cursor-pointer"
          >
            {isLogin ? 'Create a new trader account' : 'Sign in to your existing account'}
          </button>
        </p>

        <div className="mt-6 bg-white py-8 px-5 sm:px-8 shadow-sm rounded-3xl border border-[#E0E7E0]">
          {authErrorAlert && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-xs leading-relaxed text-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Configuration Note:</span>
                <span className="block whitespace-pre-line">{authErrorAlert}</span>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotMode(true); }}
                    className="text-xs font-semibold text-[#008751] hover:text-[#007043] cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                      placeholder="Repeat password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#008751] hover:bg-[#007043] disabled:opacity-50 cursor-pointer transition"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                </span>
              ) : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}

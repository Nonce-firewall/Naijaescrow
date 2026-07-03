import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { getOrCreateUserProfile } from '../lib/dbHelpers';
import { Mail, UserPlus, KeyRound, ArrowLeft, Loader2, Sparkles, AlertCircle } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [authErrorAlert, setAuthErrorAlert] = useState<string | null>(null);

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
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await getOrCreateUserProfile(data.user.id, data.user.email || '');
          addToast('Account created successfully!', 'success');
          onAuthSuccess();
        } else {
          addToast('Check your email to confirm your account.', 'info');
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


  const handleTestAccount = async (role: 'admin' | 'user') => {
    const testEmail = role === 'admin' ? 'cryptogangstar247@gmail.com' : 'local_trader@9ija.com';
    const testPassword = role === 'admin' ? 'admin123' : 'trader123';
    setEmail(testEmail);
    setPassword(testPassword);
    setIsLogin(true);
    setIsLoading(true);
    setAuthErrorAlert(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword });
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          addToast(`Provisioning sandbox ${role} account...`, 'info');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: testEmail, password: testPassword });
          if (signUpError) throw signUpError;
          if (signUpData.user) {
            await getOrCreateUserProfile(signUpData.user.id, signUpData.user.email || '');
            addToast(`Sandbox ${role} account created & logged in!`, 'success');
            onAuthSuccess();
          }
        } else {
          throw error;
        }
      } else if (data.user) {
        await getOrCreateUserProfile(data.user.id, data.user.email || '');
        addToast(`Signed in as sandbox ${role}!`, 'success');
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Failed to initialize sandbox ${role}: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

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
        {!isLogin && (
          <p className="mt-1.5 text-center text-[11px] text-[#008751] font-semibold">
            Signup is for traders only. Admin accounts are provisioned by the platform.
          </p>
        )}
        <p className="mt-2 text-center text-sm text-gray-500">
          Or{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setPassword(''); setConfirmPassword(''); }}
            className="font-bold text-[#008751] hover:text-[#007043] cursor-pointer"
          >
            {isLogin ? 'create a new trader account' : 'sign in to your existing portal'}
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
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                  placeholder="Min. 6 characters"
                />
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
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                      placeholder="Repeat password"
                    />
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

          <div className="mt-6 pt-5 border-t border-[#E0E7E0]">
            <div className="text-center mb-3">
              <span className="bg-[#E6F4EA] border border-[#D1E6D8] text-[#008751] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Sandbox Mode
              </span>
              <p className="text-xs text-gray-500 mt-2">Quick test access — auto-fills credentials:</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTestAccount('admin')}
                disabled={isLoading}
                className="p-3 bg-[#F7F9F7] hover:bg-[#E6F4EA] border border-[#E0E7E0] hover:border-[#008751] text-gray-700 hover:text-[#008751] rounded-2xl text-xs font-bold cursor-pointer transition text-center disabled:opacity-50"
              >
                Admin (Owner)
                <span className="block text-[10px] text-gray-400 font-mono mt-1 font-normal truncate">cryptogangstar247</span>
              </button>
              <button
                onClick={() => handleTestAccount('user')}
                disabled={isLoading}
                className="p-3 bg-[#F7F9F7] hover:bg-[#E6F4EA] border border-[#E0E7E0] hover:border-[#008751] text-gray-700 hover:text-[#008751] rounded-2xl text-xs font-bold cursor-pointer transition text-center disabled:opacity-50"
              >
                User (Trader)
                <span className="block text-[10px] text-gray-400 font-mono mt-1 font-normal truncate">local_trader</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

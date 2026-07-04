import React, { useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { KeyRound, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface ResetPasswordPageProps {
  onSuccess: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ResetPasswordPage({ onSuccess, addToast }: ResetPasswordPageProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      addToast('✅ Password updated! You are now signed in.', 'success');
      // Clear the recovery hash from the URL so a refresh doesn't re-trigger the flow
      // Preserve pathname + search so any existing query params are not lost
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F7] flex flex-col justify-center py-10 px-4 font-sans text-[#1A1A1A]">
      <motion.div
        className="w-full max-w-md mx-auto"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
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

        {/* Header */}
        <div className="text-center mb-6 space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
            Set a new password
          </h2>
          <p className="text-sm text-gray-500">
            Choose a strong password to secure your account.
          </p>
        </div>

        <div className="bg-white py-8 px-5 sm:px-8 shadow-sm rounded-3xl border border-[#E0E7E0]">
          {/* Icon badge */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#E6F4EA] border border-[#C5DFC9] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-[#008751]" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* New password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((p) => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm text-[#1A1A1A]"
                  placeholder="Repeat new password"
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
            </div>

            {/* Strength hint */}
            {newPassword.length > 0 && (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((lvl) => {
                  const strength =
                    newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) ? 4
                    : newPassword.length >= 10 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 3
                    : newPassword.length >= 8 ? 2
                    : 1;
                  const colours = ['bg-red-400', 'bg-amber-400', 'bg-lime-500', 'bg-[#008751]'];
                  return (
                    <div
                      key={lvl}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${lvl <= strength ? colours[strength - 1] : 'bg-slate-200'}`}
                    />
                  );
                })}
                <span className="text-[10px] text-slate-400 shrink-0">
                  {newPassword.length < 8 ? 'Weak' : newPassword.length < 10 ? 'Fair' : newPassword.length < 12 ? 'Good' : 'Strong'}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#008751] hover:bg-[#007043] disabled:opacity-50 cursor-pointer transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating…
                </span>
              ) : (
                'Update Password & Sign In'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

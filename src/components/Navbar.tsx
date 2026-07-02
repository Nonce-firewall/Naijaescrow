import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, NotificationPreferences } from '../types';
import { updateNotificationPreferences, changePassword } from '../lib/dbHelpers';
import {
  LogOut,
  UserCheck,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeftRight,
  Menu,
  X,
  UserCircle2,
  Bell,
  Settings,
  ChevronDown,
  KeyRound,
  BellRing,
  Eye,
  EyeOff
} from 'lucide-react';

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  orderUpdates: true,
  kycUpdates: true,
  announcements: true
};

interface NavbarProps {
  userProfile: UserProfile | null;
  isAdminMode: boolean;
  currentPage: 'landing' | 'auth' | 'dashboard';
  onToggleAdminMode: () => void;
  onNavigate: (page: 'landing' | 'auth' | 'dashboard') => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  bulletinCount?: number;
  onBellClick?: () => void;
}

export default function Navbar({ userProfile, isAdminMode, currentPage, onToggleAdminMode, onNavigate, addToast, bulletinCount = 0, onBellClick }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountMenuOpen]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      addToast('Logged out successfully.', 'success');
      onNavigate('landing');
      setMenuOpen(false);
      setAccountMenuOpen(false);
    } catch (err: any) {
      addToast('Logout failed.', 'error');
    }
  };

  const kycColor =
    userProfile?.kycStatus === 'approved' ? 'text-[#008751]' :
    userProfile?.kycStatus === 'pending' ? 'text-amber-600' : 'text-rose-600';

  const isLanding = currentPage === 'landing';

  return (
    <nav className="bg-white border-b border-[#E0E7E0] font-sans sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Brand — replace /logo.svg with your own logo file to customise */}
        <div
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition select-none shrink-0"
        >
          {logoError ? (
            <div className="w-8 h-8 bg-[#008751] rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
              <div className="w-3.5 h-3.5 border-2 border-white rounded-sm" />
            </div>
          ) : (
            <img
              src="/logo.svg"
              alt="9ija Escrow Logo"
              className="w-8 h-8 rounded-lg shadow-sm shrink-0"
              onError={() => setLogoError(true)}
            />
          )}
          <div className="hidden xs:flex flex-col leading-none">
            <span
              className="font-extrabold text-[#008751] text-[15px] tracking-tight leading-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              9ija Escrow
            </span>
            <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wider mt-0.5">P2P Ledger</span>
          </div>
        </div>

        {/* Desktop right section */}
        <div className="hidden sm:flex items-center gap-3">
          {isLanding ? (
            /* Landing page — logged in shows dashboard icon, visitor sees nothing */
            userProfile ? (
              <button
                onClick={() => onNavigate('dashboard')}
                title="Go to Dashboard"
                className="flex items-center gap-2 px-3 py-1.5 bg-[#E6F4EA] hover:bg-[#d1ebd7] text-[#008751] border border-[#c0e0cc] rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <UserCircle2 className="w-4 h-4" />
                <span className="hidden md:inline">Dashboard</span>
              </button>
            ) : null
          ) : (
            /* Dashboard / other pages — full user controls */
            userProfile ? (
              <>
                {userProfile.role === 'admin' && (
                  <button
                    onClick={onToggleAdminMode}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isAdminMode
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                        : 'bg-[#E6F4EA] hover:bg-[#d1ebd7] text-[#008751] border-[#c0e0cc]'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    {isAdminMode ? 'User View' : 'Admin CMS'}
                  </button>
                )}

                <div className="relative" ref={accountMenuRef}>
                  <button
                    onClick={() => setAccountMenuOpen((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition cursor-pointer ${
                      accountMenuOpen
                        ? 'border-[#008751]/40 bg-[#E6F4EA] text-[#008751]'
                        : 'border-[#E0E7E0] hover:bg-[#F7F9F7] text-gray-600'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Account
                    <ChevronDown className={`w-3 h-3 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E0E7E0] rounded-xl shadow-lg py-1.5 z-50">
                      <button
                        onClick={() => { setShowPasswordModal(true); setAccountMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-[#F7F9F7] hover:text-[#008751] transition cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 shrink-0" />
                        Change Password
                      </button>
                      <button
                        onClick={() => { setShowNotifModal(true); setAccountMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-[#F7F9F7] hover:text-[#008751] transition cursor-pointer"
                      >
                        <BellRing className="w-3.5 h-3.5 shrink-0" />
                        Notification Preferences
                      </button>
                      <div className="my-1.5 border-t border-[#E0E7E0]" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : null
          )}
        </div>

        {/* Mobile right section */}
        <div className="flex sm:hidden items-center gap-2">
          {isLanding ? (
            userProfile ? (
              <button
                onClick={() => onNavigate('dashboard')}
                className="p-2 rounded-lg border border-[#c0e0cc] bg-[#E6F4EA] text-[#008751] cursor-pointer"
                title="Dashboard"
              >
                <UserCircle2 className="w-4 h-4" />
              </button>
            ) : null
          ) : (
            <>
              {userProfile?.role === 'admin' && (
                <button
                  onClick={onToggleAdminMode}
                  className={`p-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    isAdminMode ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-[#E6F4EA] text-[#008751] border-[#c0e0cc]'
                  }`}
                  title={isAdminMode ? 'User View' : 'Admin CMS'}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              )}
              {/* Bell icon — mobile only, not shown in admin mode */}
              {userProfile && !isAdminMode && (
                <button
                  onClick={onBellClick}
                  className="relative p-2 rounded-lg border border-[#E0E7E0] text-gray-600 hover:bg-[#F7F9F7] cursor-pointer transition"
                  title="System Bulletin"
                >
                  <Bell className="w-4 h-4" />
                  {bulletinCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none border border-white">
                      {bulletinCount > 9 ? '9+' : bulletinCount}
                    </span>
                  )}
                </button>
              )}
              {userProfile && (
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="p-2 rounded-lg border border-[#E0E7E0] text-gray-600 cursor-pointer"
                >
                  {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu — dashboard pages only */}
      {menuOpen && userProfile && !isLanding && (
        <div className="sm:hidden border-t border-[#E0E7E0] bg-white px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#1A1A1A] truncate max-w-[200px] block">
                {userProfile.kycStatus === 'approved' && userProfile.kycData?.fullName
                  ? userProfile.kycData.fullName.trim().split(/\s+/).slice(0, 2).join(' ')
                  : userProfile.email}
              </span>
              {userProfile.kycStatus === 'approved' && userProfile.kycData?.fullName && (
                <span className="text-[10px] text-gray-400 font-mono block truncate max-w-[200px]">{userProfile.email}</span>
              )}
            </div>
            <span className={`text-[10px] font-bold flex items-center gap-1 ${kycColor}`}>
              {userProfile.kycStatus === 'approved' && <UserCheck className="w-3 h-3" />}
              {userProfile.kycStatus === 'pending' && <Clock className="w-3 h-3" />}
              {userProfile.kycStatus === 'rejected' && <XCircle className="w-3 h-3" />}
              {userProfile.kycStatus === 'none' && <AlertCircle className="w-3 h-3" />}
              KYC {userProfile.kycStatus.toUpperCase()}
            </span>
          </div>
          <button
            onClick={() => { setShowPasswordModal(true); setMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 border border-[#E0E7E0] hover:bg-[#F7F9F7] text-gray-600 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            Change Password
          </button>
          <button
            onClick={() => { setShowNotifModal(true); setMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 border border-[#E0E7E0] hover:bg-[#F7F9F7] text-gray-600 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer"
          >
            <BellRing className="w-4 h-4" />
            Notification Preferences
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border border-[#E0E7E0] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-gray-600 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} addToast={addToast} />
      )}

      {showNotifModal && userProfile && (
        <NotificationPreferencesModal
          userProfile={userProfile}
          onClose={() => setShowNotifModal(false)}
          addToast={addToast}
        />
      )}
    </nav>
  );
}

function ChangePasswordModal({ onClose, addToast }: { onClose: () => void; addToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    setSaving(true);
    try {
      await changePassword(newPassword);
      addToast('Password updated successfully.', 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#008751]" />
            Change Password
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
                className="w-full border border-[#E0E7E0] rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Confirm New Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
              className="w-full border border-[#E0E7E0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
              placeholder="Re-enter new password"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#008751] hover:bg-[#007043] disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold transition cursor-pointer"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function NotificationPreferencesModal({
  userProfile,
  onClose,
  addToast
}: {
  userProfile: UserProfile;
  onClose: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    userProfile.notificationPreferences || DEFAULT_NOTIF_PREFS
  );
  const [saving, setSaving] = useState(false);

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationPreferences(userProfile.uid, prefs);
      addToast('Notification preferences saved.', 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const options: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
    { key: 'orderUpdates', label: 'Order Updates', desc: 'Notify me when an order is approved or rejected.' },
    { key: 'kycUpdates', label: 'KYC Updates', desc: 'Notify me about identity verification status changes.' },
    { key: 'announcements', label: 'Announcements', desc: 'Notify me about platform-wide announcements.' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#008751]" />
            Notification Preferences
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
          {options.map(({ key, label, desc }) => (
            <label
              key={key}
              className="flex items-start gap-3 p-3 border border-[#E0E7E0] rounded-xl cursor-pointer hover:border-[#008751]/40"
            >
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={() => toggle(key)}
                className="mt-0.5 w-4 h-4 accent-[#008751] cursor-pointer"
              />
              <div>
                <div className="text-xs font-bold text-[#1A1A1A]">{label}</div>
                <div className="text-[11px] text-gray-500">{desc}</div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 shrink-0 bg-[#008751] hover:bg-[#007043] disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold transition cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}

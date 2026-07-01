import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import {
  LogOut,
  UserCheck,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeftRight,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  userProfile: UserProfile | null;
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
  onNavigate: (page: 'landing' | 'auth' | 'dashboard') => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Navbar({ userProfile, isAdminMode, onToggleAdminMode, onNavigate, addToast }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      addToast('Logged out successfully.', 'success');
      onNavigate('landing');
      setMenuOpen(false);
    } catch (err: any) {
      addToast('Logout failed.', 'error');
    }
  };

  const kycColor =
    userProfile?.kycStatus === 'approved' ? 'text-[#008751]' :
    userProfile?.kycStatus === 'pending' ? 'text-amber-600' : 'text-rose-600';

  return (
    <nav className="bg-white border-b border-[#E0E7E0] font-sans sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Brand */}
        <div
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition select-none shrink-0"
        >
          <div className="w-8 h-8 bg-[#008751] rounded-lg flex items-center justify-center text-white shadow-sm">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-sm"></div>
          </div>
          <div className="hidden xs:block">
            <span className="font-extrabold text-[#008751] text-base tracking-tight block leading-none">9ija Escrow</span>
            <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">P2P Ledger</span>
          </div>
        </div>

        {/* Desktop right section */}
        <div className="hidden sm:flex items-center gap-3">
          {userProfile ? (
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

              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-[#1A1A1A] font-mono truncate max-w-[160px]">{userProfile.email}</span>
                <span className={`text-[10px] font-bold flex items-center gap-1 justify-end ${kycColor}`}>
                  {userProfile.kycStatus === 'approved' && <UserCheck className="w-3 h-3" />}
                  {userProfile.kycStatus === 'pending' && <Clock className="w-3 h-3" />}
                  {userProfile.kycStatus === 'rejected' && <XCircle className="w-3 h-3" />}
                  {userProfile.kycStatus === 'none' && <AlertCircle className="w-3 h-3" />}
                  KYC {userProfile.kycStatus.toUpperCase()}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 border border-[#E0E7E0] hover:bg-[#F7F9F7] text-gray-600 hover:text-[#1A1A1A] px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate('auth')}
              className="bg-[#008751] hover:bg-[#007043] text-white font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile right section */}
        <div className="flex sm:hidden items-center gap-2">
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

          {!userProfile ? (
            <button
              onClick={() => onNavigate('auth')}
              className="bg-[#008751] hover:bg-[#007043] text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
            >
              Sign In
            </button>
          ) : (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-lg border border-[#E0E7E0] text-gray-600 cursor-pointer"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && userProfile && (
        <div className="sm:hidden border-t border-[#E0E7E0] bg-white px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1A1A] font-mono truncate max-w-[200px]">{userProfile.email}</span>
            <span className={`text-[10px] font-bold flex items-center gap-1 ${kycColor}`}>
              {userProfile.kycStatus === 'approved' && <UserCheck className="w-3 h-3" />}
              {userProfile.kycStatus === 'pending' && <Clock className="w-3 h-3" />}
              {userProfile.kycStatus === 'rejected' && <XCircle className="w-3 h-3" />}
              {userProfile.kycStatus === 'none' && <AlertCircle className="w-3 h-3" />}
              KYC {userProfile.kycStatus.toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border border-[#E0E7E0] hover:bg-[#F7F9F7] text-gray-600 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      )}
    </nav>
  );
}

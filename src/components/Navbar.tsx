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
  X,
  UserCircle2,
  Bell
} from 'lucide-react';

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

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E7E0] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
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

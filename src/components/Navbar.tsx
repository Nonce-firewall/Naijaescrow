import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { 
  LogOut, 
  UserCheck, 
  Clock, 
  XCircle, 
  AlertCircle, 
  LayoutDashboard, 
  ShieldAlert,
  ArrowLeftRight
} from 'lucide-react';

interface NavbarProps {
  userProfile: UserProfile | null;
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
  onNavigate: (page: 'landing' | 'auth' | 'dashboard') => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Navbar({ 
  userProfile, 
  isAdminMode, 
  onToggleAdminMode, 
  onNavigate,
  addToast 
}: NavbarProps) {

  const handleLogout = async () => {
    try {
      await signOut(auth);
      addToast('Logged out successfully.', 'success');
      onNavigate('landing');
    } catch (err: any) {
      console.error(err);
      addToast('Logout failed.', 'error');
    }
  };

  return (
    <nav className="bg-white border-b border-[#E0E7E0] py-4 px-6 font-sans">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('landing')} 
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition select-none"
        >
          <div className="w-9 h-9 bg-[#008751] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <div>
            <span className="font-extrabold text-[#008751] text-lg tracking-tight block">9ija Escrow</span>
            <span className="text-[9px] text-gray-400 font-mono block -mt-1 uppercase font-bold tracking-wider">P2P Ledger</span>
          </div>
        </div>

        {/* Dynamic Nav Right Section */}
        <div className="flex items-center gap-4">
          {userProfile ? (
            <>
              {/* If user is Admin, render the quick View Switcher */}
              {userProfile.role === 'admin' && (
                <button
                  onClick={onToggleAdminMode}
                  className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm border ${
                    isAdminMode
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-200'
                      : 'bg-[#E6F4EA] hover:bg-[#d1ebd7] text-[#008751] border-[#c0e0cc]'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  {isAdminMode ? 'View User Dashboard' : 'View Admin CMS'}
                </button>
              )}

              {/* User email & verification badge */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-[#1A1A1A] font-mono truncate max-w-[200px]">{userProfile.email}</span>
                <span className={`text-[10px] font-bold flex items-center gap-1 justify-end ${
                  userProfile.kycStatus === 'approved' 
                    ? 'text-[#008751]' 
                    : userProfile.kycStatus === 'pending'
                      ? 'text-amber-600 animate-pulse'
                      : 'text-rose-600'
                }`}>
                  {userProfile.kycStatus === 'approved' && <UserCheck className="w-3 h-3 text-[#008751]" />}
                  {userProfile.kycStatus === 'pending' && <Clock className="w-3 h-3 text-amber-500" />}
                  {userProfile.kycStatus === 'rejected' && <XCircle className="w-3 h-3 text-rose-500" />}
                  {userProfile.kycStatus === 'none' && <AlertCircle className="w-3 h-3 text-amber-500" />}
                  KYC {userProfile.kycStatus.toUpperCase()}
                </span>
              </div>

              {/* Mobile Role Switch Indicator for testing */}
              {userProfile.role === 'admin' && (
                <button
                  onClick={onToggleAdminMode}
                  className="sm:hidden flex items-center justify-center p-2 rounded-lg bg-[#F7F9F7] border border-[#E0E7E0] text-gray-700 cursor-pointer"
                  title={isAdminMode ? "Switch to User View" : "Switch to Admin CMS"}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              )}

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 border border-[#E0E7E0] hover:bg-[#F7F9F7] text-gray-600 hover:text-[#1A1A1A] px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => onNavigate('auth')}
                className="bg-[#008751] hover:bg-[#007043] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import {
  getOrCreateUserProfile,
  ensureDefaultSettings,
  ensureDefaultAnnouncements,
  ensureDefaultCoins,
  DEFAULT_SETTINGS,
  rowToSettings,
  rowToOrder,
  rowToAnnouncement,
  rowToCoin,
  rowToUserProfile,
  rowToDispute
} from './lib/dbHelpers';
import { UserProfile, Order, AdminSettings, Announcement, CoinListing, Dispute } from './types';

import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Notification, { ToastMessage } from './components/Notification';

const AuthPage = lazy(() => import('./components/AuthPage'));
const UserDashboard = lazy(() => import('./components/UserDashboard'));
const AdminCMS = lazy(() => import('./components/AdminCMS'));

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signin');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Keep a non-stale ref so realtime callbacks can compare old vs new profile without stale closures
  const userProfileRef = useRef<UserProfile | null>(null);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kycUsers, setKycUsers] = useState<UserProfile[]>([]);
  const [coins, setCoins] = useState<CoinListing[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Keep userProfileRef in sync so realtime callbacks can read current value without stale closures
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  // Seed DB when admin logs in
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      ensureDefaultSettings();
      ensureDefaultAnnouncements();
      ensureDefaultCoins();
    }
  }, [userProfile]);

  // Auth state listener
  useEffect(() => {
    setIsInitializing(true);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        try {
          const profile = await getOrCreateUserProfile(session.user.id, session.user.email || '');
          setUserProfile(profile);
          setIsAdminMode(profile.role === 'admin');
          setCurrentPage('dashboard');
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      }
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser(session.user);
        try {
          const profile = await getOrCreateUserProfile(session.user.id, session.user.email || '');
          setUserProfile(profile);
          setIsAdminMode(profile.role === 'admin');
          setCurrentPage('dashboard');
        } catch (err) {
          console.error('Error fetching profile:', err);
          addToast('Could not load user profile.', 'error');
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserProfile(null);
        setIsAdminMode(false);
        setCurrentPage('landing');
      }
      setIsInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime: Settings
  useEffect(() => {
    // Initial fetch
    supabase.from('settings').select('*').eq('id', 'admin_settings').single().then(({ data }) => {
      if (data) setSettings(rowToSettings(data));
    });

    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
        if (payload.new) setSettings(rowToSettings(payload.new));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: Announcements
  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setAnnouncements(data.map(rowToAnnouncement));
    });

    const channel = supabase
      .channel('announcements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          if (data) setAnnouncements(data.map(rowToAnnouncement));
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: Orders (filtered by user or admin)
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    const isTrader = userProfile?.role !== 'admin';

    const fetchOrders = async () => {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (isTrader) query = query.eq('user_id', currentUser.id);
      const { data } = await query;
      if (data) setOrders(data.map(rowToOrder));
    };

    fetchOrders();

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as any;
        // Push notification to trader when their order is processed
        if (isTrader && updated?.user_id === currentUser.id) {
          if (updated?.status === 'completed') {
            const label = updated?.type === 'buy' ? `${updated?.crypto_amount} USDT purchase` : `₦${Number(updated?.ngn_amount).toLocaleString()} sell`;
            addToast(`✅ Order approved! Your ${label} has been completed.`, 'success');
          } else if (updated?.status === 'rejected') {
            const reason = updated?.rejection_reason ? ` Reason: ${updated.rejection_reason}` : '';
            addToast(`❌ Order declined.${reason}`, 'error');
          }
        }
        fetchOrders();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const inserted = payload.new as any;
        if (isTrader && inserted?.user_id === currentUser.id) {
          const typeLabel = inserted?.type === 'buy' ? 'Buy' : 'Sell';
          const ordId = (inserted?.id as string)?.substring(0, 6).toUpperCase();
          addToast(`📋 ${typeLabel} order #${ordId} submitted! Awaiting admin review.`, 'info');
        }
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, userProfile]);

  // Realtime: KYC Users (admin only)
  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      setKycUsers([]);
      return;
    }

    supabase.from('users').select('*').then(({ data }) => {
      if (data) setKycUsers(data.map(rowToUserProfile));
    });

    const channel = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        supabase.from('users').select('*').then(({ data }) => {
          if (data) setKycUsers(data.map(rowToUserProfile));
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userProfile]);

  // Realtime: Coins
  useEffect(() => {
    supabase.from('coins').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setCoins(data.map(rowToCoin));
    });

    const channel = supabase
      .channel('coins-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coins' }, () => {
        supabase.from('coins').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          if (data) setCoins(data.map(rowToCoin));
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: Disputes (admin only)
  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      setDisputes([]);
      return;
    }

    supabase.from('disputes').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setDisputes(data.map(rowToDispute));
    });

    const channel = supabase
      .channel('disputes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => {
        supabase.from('disputes').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          if (data) setDisputes(data.map(rowToDispute));
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userProfile]);

  // Realtime: User profile changes (for KYC status updates)
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('my-profile-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${currentUser.id}`
      }, (payload) => {
        if (!payload.new) return;
        const newProfile = rowToUserProfile(payload.new);
        const old = userProfileRef.current;

        // KYC status notifications
        if (old && old.kycStatus !== newProfile.kycStatus) {
          if (newProfile.kycStatus === 'approved') {
            addToast('🎉 KYC Approved! Your account is now verified — trading is unlocked.', 'success');
          } else if (newProfile.kycStatus === 'rejected') {
            addToast('⚠️ KYC Rejected. Check the reason and resubmit with clearer documents.', 'error');
          } else if (newProfile.kycStatus === 'none') {
            addToast('ℹ️ KYC has been reset by admin. Please resubmit your documents.', 'info');
          } else if (newProfile.kycStatus === 'pending') {
            addToast('⏳ KYC documents are under review. You\'ll be notified when done.', 'info');
          }
        }

        // Account status notifications
        if (old && old.accountStatus !== newProfile.accountStatus) {
          if (newProfile.accountStatus === 'suspended') {
            addToast('🚫 Your account has been suspended. Contact support for details.', 'error');
          } else if (newProfile.accountStatus === 'active' && old.accountStatus === 'suspended') {
            addToast('✅ Account suspension lifted! You can place orders again.', 'success');
          } else if (newProfile.accountStatus === 'terminated') {
            addToast('❌ Your account has been permanently terminated.', 'error');
          }
        }

        setUserProfile(newProfile);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const handleDatabaseRefresh = () => {
    addToast('Ledger data synced with backend.', 'success');
  };

  const navigateToPage = (page: 'landing' | 'auth' | 'dashboard', extra?: string) => {
    if (page === 'auth') setAuthInitialMode(extra === 'signup' ? 'signup' : 'signin');
    setCurrentPage(page);
  };

  const handleToggleAdminView = () => {
    setIsAdminMode((prev) => !prev);
    addToast(`Switched to ${!isAdminMode ? 'Admin Portal' : 'User Portal'}`, 'info');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] flex flex-col justify-center items-center font-sans">
        <div className="w-12 h-12 bg-[#008751] rounded-xl flex items-center justify-center text-white animate-bounce shadow-sm">
          <div className="w-6 h-6 border-2 border-white rounded-sm"></div>
        </div>
        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-4">
          Securing Ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F9F7] min-h-screen text-[#1A1A1A] flex flex-col">
      <div className="flex-1">
        {currentPage !== 'auth' && (
          <Navbar
            userProfile={userProfile}
            isAdminMode={isAdminMode}
            currentPage={currentPage}
            onToggleAdminMode={handleToggleAdminView}
            onNavigate={navigateToPage}
            addToast={addToast}
          />
        )}

        {currentPage === 'landing' && (
          <LandingPage
            announcements={announcements}
            settings={settings}
            onNavigate={navigateToPage}
          />
        )}

        {currentPage === 'auth' && (
          <Suspense fallback={<div className="min-h-screen bg-[#F7F9F7] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#008751] border-t-transparent rounded-full animate-spin" /></div>}>
            <AuthPage
              onBack={() => setCurrentPage('landing')}
              onAuthSuccess={() => setCurrentPage('dashboard')}
              addToast={addToast}
              initialMode={authInitialMode}
            />
          </Suspense>
        )}

        {currentPage === 'dashboard' && userProfile && (
          <Suspense fallback={<div className="min-h-screen bg-[#F7F9F7] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#008751] border-t-transparent rounded-full animate-spin" /></div>}>
            {isAdminMode && userProfile.role === 'admin' ? (
              <AdminCMS
                userProfile={userProfile}
                orders={orders}
                kycUsers={kycUsers}
                settings={settings}
                announcements={announcements}
                coins={coins}
                disputes={disputes}
                addToast={addToast}
                onRefresh={handleDatabaseRefresh}
              />
            ) : (
              <UserDashboard
                userProfile={userProfile}
                orders={orders}
                settings={settings}
                announcements={announcements}
                coins={coins}
                disputes={disputes}
                addToast={addToast}
                onRefresh={handleDatabaseRefresh}
              />
            )}
          </Suspense>
        )}
      </div>

      <Notification toasts={toasts} onClose={removeToast} />
    </div>
  );
}

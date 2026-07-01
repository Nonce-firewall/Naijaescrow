import React, { useState, useEffect, lazy, Suspense } from 'react';
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
  rowToUserProfile
} from './lib/dbHelpers';
import { UserProfile, Order, AdminSettings, Announcement, CoinListing } from './types';

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
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kycUsers, setKycUsers] = useState<UserProfile[]>([]);
  const [coins, setCoins] = useState<CoinListing[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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

    const fetchOrders = async () => {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (userProfile?.role !== 'admin') {
        query = query.eq('user_id', currentUser.id);
      }
      const { data } = await query;
      if (data) setOrders(data.map(rowToOrder));
    };

    fetchOrders();

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
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
        if (payload.new) setUserProfile(rowToUserProfile(payload.new));
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

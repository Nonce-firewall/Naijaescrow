import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc 
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { 
  getOrCreateUserProfile, 
  ensureDefaultSettings, 
  ensureDefaultAnnouncements, 
  ensureDefaultCoins, 
  DEFAULT_SETTINGS 
} from './lib/dbHelpers';
import { UserProfile, Order, AdminSettings, Announcement, CoinListing } from './types';

// Component Imports
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import UserDashboard from './components/UserDashboard';
import AdminCMS from './components/AdminCMS';
import Notification, { ToastMessage } from './components/Notification';

export default function App() {
  // Navigation State: 'landing' | 'auth' | 'dashboard'
  const [currentPage, setCurrentPage] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signin');
  
  // Auth & Profile state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Database Data States
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kycUsers, setKycUsers] = useState<UserProfile[]>([]);
  const [coins, setCoins] = useState<CoinListing[]>([]);

  // Toast System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Graceful error logging for snapshot listeners to prevent test runner crashes on expected auth transitions
  const handleListenerError = (context: string, error: any) => {
    const isPermissionError = error?.message?.toLowerCase().includes('permission') || 
                              error?.code?.toLowerCase().includes('permission') ||
                              error?.message?.toLowerCase().includes('insufficient');
    if (isPermissionError) {
      console.warn(`[Graceful Boundary] ${context}:`, error.message || error);
    } else {
      console.error(`${context}:`, error);
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Seed the DB settings, announcements, and coins only when an Admin is logged in to avoid unauthenticated permission errors
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      const seedDatabase = async () => {
        await ensureDefaultSettings();
        await ensureDefaultAnnouncements();
        await ensureDefaultCoins();
      };
      seedDatabase();
    }
  }, [userProfile]);

  // Subscribe to Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsInitializing(true);
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await getOrCreateUserProfile(user.uid, user.email || '');
          setUserProfile(profile);
          setIsAdminMode(profile.role === 'admin');
          setCurrentPage('dashboard');
        } catch (err) {
          console.error('Error fetching user profile:', err);
          addToast('Could not load user profile metadata.', 'error');
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setIsAdminMode(false);
        if (currentPage === 'dashboard') {
          setCurrentPage('landing');
        }
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, [currentPage]);

  // Subscribe to Exchange Rates & Admin Settings
  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'admin_settings');
    const unsubscribe = onSnapshot(settingsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AdminSettings);
      }
    }, (error) => {
      handleListenerError('Error listening to settings', error);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Bulletins/Announcements
  useEffect(() => {
    const announcementsQuery = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
      const list: Announcement[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(list);
    }, (error) => {
      handleListenerError('Error listening to announcements', error);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Orders based on user identity (Admin hears all, User hears only own)
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    let ordersQuery;
    if (userProfile?.role === 'admin') {
      ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
    } else {
      ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(list);
    }, (error) => {
      handleListenerError('Error listening to orders', error);
    });

    return () => unsubscribe();
  }, [currentUser, userProfile]);

  // Subscribe to Users List if current user is an Admin (to manage KYC reviews)
  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      setKycUsers([]);
      return;
    }

    const usersQuery = query(
      collection(db, 'users')
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as UserProfile);
      });
      setKycUsers(list);
    }, (error) => {
      handleListenerError('Error listening to KYC users', error);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Subscribe to Coins list
  useEffect(() => {
    const coinsQuery = query(
      collection(db, 'coins')
    );
    const unsubscribe = onSnapshot(coinsQuery, (snapshot) => {
      const list: CoinListing[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CoinListing);
      });
      // Sort client-side to ensure robust ordering without database-level constraints
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setCoins(list);
    }, (error) => {
      handleListenerError('Error listening to coins', error);
    });

    return () => unsubscribe();
  }, []);

  // Forced refresh helper passed to child components
  const handleDatabaseRefresh = () => {
    addToast('Ledger data synced with backend.', 'success');
  };

  const navigateToPage = (page: 'landing' | 'auth' | 'dashboard', extra?: string) => {
    if (page === 'auth') {
      setAuthInitialMode(extra === 'signup' ? 'signup' : 'signin');
    }
    setCurrentPage(page);
  };

  const handleToggleAdminView = () => {
    setIsAdminMode((prev) => !prev);
    addToast(`Switched view to ${!isAdminMode ? 'Admin Portal' : 'User Portal'}`, 'info');
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
    <div className="bg-[#F7F9F7] min-h-screen text-[#1A1A1A] flex flex-col justify-between">
      <div>
        {/* Navigation Bar */}
        {currentPage !== 'auth' && (
          <Navbar 
            userProfile={userProfile} 
            isAdminMode={isAdminMode}
            onToggleAdminMode={handleToggleAdminView}
            onNavigate={navigateToPage}
            addToast={addToast}
          />
        )}

        {/* Core Screen Router */}
        {currentPage === 'landing' && (
          <LandingPage 
            announcements={announcements} 
            settings={settings}
            onNavigate={navigateToPage}
          />
        )}

        {currentPage === 'auth' && (
          <AuthPage 
            onBack={() => setCurrentPage('landing')} 
            onAuthSuccess={() => setCurrentPage('dashboard')}
            addToast={addToast}
            initialMode={authInitialMode}
          />
        )}

        {currentPage === 'dashboard' && userProfile && (
          <>
            {isAdminMode ? (
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
          </>
        )}
      </div>

      {/* Shared Toasts notification center */}
      <Notification toasts={toasts} onClose={removeToast} />
    </div>
  );
}

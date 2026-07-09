import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
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
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsPage from './components/TermsPage';
import SupportPage from './components/SupportPage';

// ── Static URL routing (no react-router needed) ──────────────────────────────
// Normalize pathname: strip trailing slash so /privacy/ === /privacy
const _pathname = typeof window !== 'undefined'
  ? window.location.pathname.replace(/\/$/, '') || '/'
  : '/';
const STATIC_ROUTES: Record<string, { title: string; component: React.ReactElement }> = {
  '/privacy': { title: 'Privacy Policy — 9ija Escrow', component: <PrivacyPolicyPage /> },
  '/terms':   { title: 'Terms of Use — 9ija Escrow',   component: <TermsPage /> },
  '/support': { title: 'Support — 9ija Escrow',         component: <SupportPage /> },
};
const _staticRoute = STATIC_ROUTES[_pathname] ?? null;
if (_staticRoute && typeof document !== 'undefined') {
  document.title = _staticRoute.title;
}

const AuthPage = lazy(() => import('./components/AuthPage'));
const UserDashboard = lazy(() => import('./components/UserDashboard'));
const AdminCMS = lazy(() => import('./components/AdminCMS'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'));

export default function App() {
  // Serve static pages without loading auth/realtime
  if (_staticRoute) return <>{_staticRoute.component}</>;

  const [currentPage, setCurrentPage] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signin');

  // Detect email-verification redirect before Supabase clears the URL hash
  const isEmailVerificationRef = useRef(
    typeof window !== 'undefined' && window.location.hash.includes('type=signup')
  );
  // Detect password-recovery redirect (link from reset email)
  const isPasswordRecoveryRef = useRef(
    typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
  );

  // Show the set-new-password screen when a recovery session is active
  const [showPasswordReset, setShowPasswordReset] = useState<boolean>(false);
  // Ref mirrors the state so onAuthStateChange closure (created once) never reads a stale value
  const showPasswordResetRef = useRef<boolean>(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Keep a non-stale ref so realtime callbacks can compare old vs new profile without stale closures
  const userProfileRef = useRef<UserProfile | null>(null);
  // Timestamp of the current auth session start. Realtime order/KYC notifications are
  // only shown for events that occurred AFTER this timestamp, preventing a flood of
  // stale toasts when restore_deleted_user cascades a user_id update across all
  // historical orders (ON UPDATE CASCADE triggers UPDATE events for every past order).
  const sessionStartRef = useRef<number>(Date.now());
  // Supabase v2 fires onAuthStateChange with an initial event (INITIAL_SESSION,
  // and sometimes SIGNED_IN) for the SAME session that the manual
  // supabase.auth.getSession() call on mount also resolves. Both paths run the
  // identical account-status gating (terminated/pending_reactivation/deleted)
  // and would otherwise each fire their own toast + signOut, producing the
  // duplicate "account deleted" toasts users saw on login and on landing.
  // This ref dedupes by access_token so the gating logic — and its toast —
  // only ever runs once per underlying session, no matter which handler
  // (mount getSession, onAuthStateChange, focus revalidation) observes it first.
  const handledGateTokensRef = useRef<Set<string>>(new Set());
  const shouldHandleAccountGate = (token: string | undefined | null): boolean => {
    if (!token) return true;
    if (handledGateTokensRef.current.has(token)) return false;
    handledGateTokensRef.current.add(token);
    return true;
  };
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kycUsers, setKycUsers] = useState<UserProfile[]>([]);
  const [coins, setCoins] = useState<CoinListing[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputesPage, setDisputesPage] = useState(0);
  const [hasMoreDisputes, setHasMoreDisputes] = useState(true);
  const DISPUTES_PAGE_SIZE = 20;
  /** Live NGN/USDT market price from CoinGecko — refreshed every 5 minutes */
  const [liveNgnRate, setLiveNgnRate] = useState<number | null>(null);

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
  // Keep showPasswordResetRef in sync so the onAuthStateChange closure (created once) never reads stale state
  useEffect(() => { showPasswordResetRef.current = showPasswordReset; }, [showPasswordReset]);

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
        // Implicit-flow recovery: hash contains type=recovery
        if (isPasswordRecoveryRef.current) {
          isPasswordRecoveryRef.current = false;
          setShowPasswordReset(true);
          setIsInitializing(false);
          return;
        }
        // PKCE-flow: any auth callback (recovery, OAuth, email verify) arrives as ?code=...
        // onAuthStateChange fires with the correct event type and handles navigation.
        // Skip eager profile fetch here to avoid racing with PASSWORD_RECOVERY.
        if (new URLSearchParams(window.location.search).has('code')) {
          setIsInitializing(false);
          return;
        }
        try {
          const profile = await getOrCreateUserProfile(session.user.id, session.user.email || '');
          // Mirror the same status gates used in onAuthStateChange — this path
          // runs on page reload / tab restore when a JWT is still valid. Without
          // these checks a deleted/terminated user whose token hasn't expired yet
          // would briefly see their dashboard before onAuthStateChange corrects it.
          // Gate on shouldHandleAccountGate so this doesn't fire a second toast
          // when onAuthStateChange's initial event handles the same session.
          if (profile.accountStatus === 'terminated' || profile.accountStatus === 'pending_reactivation' || profile.accountStatus === 'deleted') {
            if (!shouldHandleAccountGate(session.access_token)) {
              setIsInitializing(false);
              return;
            }
            await supabase.auth.signOut();
            if (profile.accountStatus === 'terminated') {
              const reason = profile.terminateReason ? ` Reason: ${profile.terminateReason}` : '';
              addToast(`Your account has been permanently terminated.${reason}`, 'error');
            } else if (profile.accountStatus === 'pending_reactivation') {
              addToast('Our records show you previously deleted this account. Please contact admin to reactivate it before you can access the platform.', 'error');
            } else {
              addToast('Your account has been deleted. Please contact support if you believe this is an error.', 'error');
            }
            setIsInitializing(false);
            return;
          }
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
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link — keep them on the set-new-password screen
        setShowPasswordReset(true);
        setIsInitializing(false);
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        // If we're in a password-reset flow, SIGNED_IN fires after updateUser —
        // the ResetPasswordPage calls onSuccess() which clears showPasswordReset
        // and navigates to dashboard. Don't intercept here.
        // Use the ref (not state) to avoid reading a stale closure value.
        if (showPasswordResetRef.current) {
          setIsInitializing(false);
          return;
        }
        // Reset the session start boundary so that only realtime events fired
        // AFTER this moment generate toast notifications. Without this, the
        // ON UPDATE CASCADE that fires when restore_deleted_user repoints the
        // user's id to a new auth UID would trigger toasts for every historical
        // completed/rejected order simultaneously.
        sessionStartRef.current = Date.now();
        setCurrentUser(session.user);
        try {
          const profile = await getOrCreateUserProfile(session.user.id, session.user.email || '');
          // Gate on shouldHandleAccountGate so this doesn't fire a second toast
          // when the mount-time getSession() handler already handled the same session.
          if (profile.accountStatus === 'terminated' || profile.accountStatus === 'pending_reactivation' || profile.accountStatus === 'deleted') {
            if (!shouldHandleAccountGate(session.access_token)) {
              setIsInitializing(false);
              return;
            }
            await supabase.auth.signOut();
            if (profile.accountStatus === 'terminated') {
              const reason = profile.terminateReason ? ` Reason: ${profile.terminateReason}` : '';
              addToast(`Your account has been permanently terminated.${reason}`, 'error');
            } else if (profile.accountStatus === 'pending_reactivation') {
              addToast('Our records show you previously deleted this account. Please contact admin to reactivate it before you can access the platform.', 'error');
            } else {
              addToast('Your account has been deleted. Please contact support if you believe this is an error.', 'error');
            }
            setIsInitializing(false);
            return;
          }
          if (profile.accountStatus === 'suspended') {
            // Suspended users may still sign in to see their dashboard & appeal,
            // but trading is blocked in UserDashboard. Do NOT sign them out.
          }
          setUserProfile(profile);
          setIsAdminMode(profile.role === 'admin');
          setCurrentPage('dashboard');
          if (isEmailVerificationRef.current) {
            isEmailVerificationRef.current = false;
            addToast('✅ Email verified! Welcome to 9ijaEscrow.', 'success');
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
          addToast('Could not load user profile.', 'error');
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserProfile(null);
        setIsAdminMode(false);
        setShowPasswordReset(false);
        setCurrentPage('landing');
        // Deliberately NOT clearing handledGateTokensRef here: a SIGNED_OUT event
        // fires as part of the gating flow itself (signOut() is called before the
        // toast), so clearing now would race with any other in-flight callback
        // still holding a reference to the same now-superseded access_token and
        // let it re-pass the gate, reintroducing the duplicate toast. The set is
        // small (one token per completed sign-in attempt) and a full page reload
        // resets it anyway, so we just let it grow for the tab's lifetime.
      }
      setIsInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Live market rate: CoinGecko NGN/USDT — single global fetch, refreshed every 5 min
  useEffect(() => {
    let cancelled = false;
    const fetchRate = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setLiveNgnRate(json?.tether?.ngn ?? null);
      } catch { /* silently ignore — markup rates are still shown */ }
    };
    fetchRate();
    const iv = setInterval(fetchRate, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // Realtime: Settings
  useEffect(() => {
    // Initial fetch
    // Use select('*') so no explicit column name can 400 the fetch.
    // rowToSettings handles both old (usdt_rate) and new (usdt_sell_markup/usdt_buy_markup) schemas.
    supabase.from('settings')
      .select('*')
      .eq('id', 'admin_settings').single().then(({ data, error }) => {
        if (error) console.error('[settings fetch]', error.message);
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
    const ANN_COLS = 'id,title,content,scope,is_active,created_at';
    supabase.from('announcements').select(ANN_COLS).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setAnnouncements(data.map(rowToAnnouncement));
    });

    const channel = supabase
      .channel('announcements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        supabase.from('announcements').select(ANN_COLS).order('created_at', { ascending: false }).then(({ data }) => {
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

    const ORDER_COLS = 'id,user_id,user_email,type,crypto_amount,ngn_amount,rate,status,network,token,payment_screenshot,user_bank_details,admin_bank_details,admin_wallet_address,user_wallet_address,blockchain_tx_id,rejection_reason,created_at,processed_at';
    const fetchOrders = async () => {
      let query = supabase.from('orders').select(ORDER_COLS).order('created_at', { ascending: false });
      if (isTrader) query = query.eq('user_id', currentUser.id);
      // Admin: cap at 2 000 most-recent orders to prevent runaway reads at scale
      if (!isTrader) query = (query as any).limit(2000);
      const { data } = await query;
      if (data) setOrders(data.map(rowToOrder));
    };

    fetchOrders();

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as any;
        // Push notification to trader when their order is processed.
        // Guard: only notify if processed_at is AFTER this session started.
        // When restore_deleted_user repoints users.id to a new auth UID, the
        // ON UPDATE CASCADE fires UPDATE events on all historical orders (only
        // user_id changes, not status/processed_at). Those stale events have
        // processed_at older than sessionStartRef.current and are silently dropped.
        if (isTrader && updated?.user_id === currentUser.id) {
          const processedAt: number = updated?.processed_at ?? 0;
          if (processedAt > sessionStartRef.current) {
            if (updated?.status === 'completed') {
              const label = updated?.type === 'buy' ? `${updated?.crypto_amount} USDT purchase` : `₦${Number(updated?.ngn_amount).toLocaleString()} sell`;
              addToast(`✅ Order approved! Your ${label} has been completed.`, 'success');
            } else if (updated?.status === 'rejected') {
              const reason = updated?.rejection_reason ? ` Reason: ${updated.rejection_reason}` : '';
              addToast(`❌ Order declined.${reason}`, 'error');
            }
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

    const USER_COLS = 'id,email,role,kyc_status,kyc_data,account_status,suspend_reason,terminate_reason,notification_preferences,created_at,deleted_at';
    supabase.from('users').select(USER_COLS).limit(5000).then(({ data }) => {
      if (data) setKycUsers(data.map(rowToUserProfile));
    });

    const channel = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        supabase.from('users').select(USER_COLS).limit(5000).then(({ data }) => {
          if (data) setKycUsers(data.map(rowToUserProfile));
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userProfile]);

  // Realtime: Coins
  useEffect(() => {
    const COIN_COLS = 'id,name,symbol,network,wallet_address,rate,logo_url,published,price_pegged,fee_percentage,min_trade_amount,created_at';
    supabase.from('coins').select(COIN_COLS).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setCoins(data.map(rowToCoin));
    });

    const channel = supabase
      .channel('coins-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coins' }, () => {
        supabase.from('coins').select(COIN_COLS).order('created_at', { ascending: false }).then(({ data }) => {
          if (data) setCoins(data.map(rowToCoin));
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: Disputes (admin sees all, user sees own) with pagination
  const fetchDisputesPage = useCallback(async (page: number, append = false) => {
    const DISPUTE_COLS = 'id,order_id,user_id,user_email,message,image_urls,status,admin_response,created_at,resolved_at';
    const offset = page * DISPUTES_PAGE_SIZE;

    const { data, count } = await supabase
      .from('disputes')
      .select(DISPUTE_COLS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + DISPUTES_PAGE_SIZE - 1);

    if (data) {
      const mapped = data.map(rowToDispute);
      setDisputes(prev => append ? [...prev, ...mapped] : mapped);
      setHasMoreDisputes(offset + data.length < (count || 0));
    }
  }, []);

  useEffect(() => {
    if (!userProfile) {
      setDisputes([]);
      setDisputesPage(0);
      setHasMoreDisputes(true);
      return;
    }

    // Initial fetch (page 0)
    setDisputesPage(0);
    fetchDisputesPage(0, false);

    // Realtime subscription - refetch current page when changes occur
    const channel = supabase
      .channel('disputes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => {
        fetchDisputesPage(0, false);
        setDisputesPage(0);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userProfile, fetchDisputesPage]);

  const loadMoreDisputes = useCallback(() => {
    const nextPage = disputesPage + 1;
    setDisputesPage(nextPage);
    fetchDisputesPage(nextPage, true);
  }, [disputesPage, fetchDisputesPage]);

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
        // Merge the incoming partial payload with the current profile row so that
        // fields absent from the realtime event (e.g. kyc_data when only
        // notification_preferences changed) are preserved rather than dropped.
        const cur = userProfileRef.current;
        const baseRow = cur ? {
          id: cur.uid,
          email: cur.email,
          role: cur.role,
          kyc_status: cur.kycStatus,
          kyc_data: cur.kycData,
          account_status: cur.accountStatus,
          suspend_reason: cur.suspendReason,
          terminate_reason: cur.terminateReason,
          notification_preferences: cur.notificationPreferences,
          created_at: cur.createdAt,
          deleted_at: cur.deletedAt,
        } : {};
        const newProfile = rowToUserProfile({ ...baseRow, ...payload.new });
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
          } else if (newProfile.accountStatus === 'pending_reactivation') {
            addToast('⏳ Your account is pending admin reactivation. Please contact support.', 'info');
          } else if (newProfile.accountStatus === 'active' && old.accountStatus === 'pending_reactivation') {
            addToast('✅ Your account has been reactivated! You can now access the platform.', 'success');
          }
        }

        // Lockout enforcement: if admin just deleted/terminated/marked-pending
        // this account, sign the user out immediately so they cannot continue
        // using the dashboard or perform transactions. The realtime event fires
        // even while the tab is open and the JWT is still cached.
        if (newProfile.accountStatus === 'deleted' ||
            newProfile.accountStatus === 'terminated' ||
            newProfile.accountStatus === 'pending_reactivation') {
          (async () => {
            await supabase.auth.signOut();
            setUserProfile(null);
            setCurrentUser(null);
            setIsAdminMode(false);
            if (newProfile.accountStatus === 'deleted') {
              addToast('Your account has been deleted. Please contact support if you believe this is an error.', 'error');
            } else if (newProfile.accountStatus === 'terminated') {
              const reason = newProfile.terminateReason ? ` Reason: ${newProfile.terminateReason}` : '';
              addToast(`Your account has been permanently terminated.${reason}`, 'error');
            } else {
              addToast('Our records show you previously deleted this account. Please contact admin to reactivate it before you can access the platform.', 'error');
            }
          })();
          return;
        }

        setUserProfile(newProfile);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  // Re-validate session on tab focus / window show. When admin deletes a user's
  // auth account while the user's tab is in the background, the cached JWT in
  // localStorage keeps the dashboard alive. Re-fetching the profile on focus
  // catches this: if the profile is gone or the account is deleted/terminated/
  // pending, we sign the user out immediately. Also handles the plain refresh
  // case where getSession() returns a stale token for a deleted auth account.
  useEffect(() => {
    if (!currentUser) return;

    const revalidate = () => {
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            // Auth account gone — token invalidated server-side.
            await supabase.auth.signOut();
            setUserProfile(null);
            setCurrentUser(null);
            setIsAdminMode(false);
            addToast('Your session is no longer valid. Please sign in again.', 'error');
            return;
          }
          // Session still valid — re-fetch profile to catch admin status changes
          // (deleted/terminated/pending) that happened while the tab was hidden.
          const { data: row } = await supabase
            .from('users')
            .select('id,email,role,kyc_status,kyc_data,account_status,suspend_reason,terminate_reason,notification_preferences,created_at,deleted_at')
            .eq('id', session.user.id)
            .maybeSingle();
          if (!row) {
            // Profile row deleted entirely (e.g. admin hard-deleted via SQL).
            await supabase.auth.signOut();
            setUserProfile(null);
            setCurrentUser(null);
            setIsAdminMode(false);
            addToast('Your account is no longer available. Please contact support.', 'error');
            return;
          }
          const p = rowToUserProfile(row);
          if (p.accountStatus === 'deleted' ||
              p.accountStatus === 'terminated' ||
              p.accountStatus === 'pending_reactivation') {
            await supabase.auth.signOut();
            setUserProfile(null);
            setCurrentUser(null);
            setIsAdminMode(false);
            // Gate on shouldHandleAccountGate so a focus/visibility revalidation
            // doesn't fire a duplicate toast for a session already handled by
            // the mount-time getSession() or onAuthStateChange gating above.
            if (shouldHandleAccountGate(session.access_token)) {
              if (p.accountStatus === 'deleted') {
                addToast('Your account has been deleted. Please contact support if you believe this is an error.', 'error');
              } else if (p.accountStatus === 'terminated') {
                const reason = p.terminateReason ? ` Reason: ${p.terminateReason}` : '';
                addToast(`Your account has been permanently terminated.${reason}`, 'error');
              } else {
                addToast('Our records show you previously deleted this account. Please contact admin to reactivate it before you can access the platform.', 'error');
              }
            }
          } else if (p.accountStatus === 'suspended') {
            // Suspended users may still view dashboard — just update profile.
            setUserProfile(p);
          } else {
            setUserProfile(p);
          }
        } catch {
          // Network error during revalidation — non-fatal, don't lock out on flaky network.
        }
      })();
    };

    const handleVisibility = () => { if (document.visibilityState === 'visible') revalidate(); };
    const handleFocus = () => revalidate();
    const handleOnline = () => revalidate();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [currentUser]);

  const handleDatabaseRefresh = () => {
    addToast('Ledger data synced with backend.', 'success');
  };

  // Mobile bulletin drawer state
  const [mobileBulletinOpen, setMobileBulletinOpen] = useState(false);
  const [bulletinCount, setBulletinCount] = useState(0);

  const navigateToPage = (page: 'landing' | 'auth' | 'dashboard', extra?: string) => {
    // If the user is already logged in, skip the auth page entirely
    if (page === 'auth' && userProfile) {
      setCurrentPage('dashboard');
      return;
    }
    if (page === 'auth') setAuthInitialMode(extra === 'signup' ? 'signup' : 'signin');
    setCurrentPage(page);
  };

  const handleToggleAdminView = () => {
    setIsAdminMode((prev) => !prev);
    addToast(`Switched to ${!isAdminMode ? 'Admin Portal' : 'User Portal'}`, 'info');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] flex flex-col justify-center items-center font-sans gap-6">
        <motion.img
          src="/logo-icon.png"
          alt="9ija Escrow"
          className="h-16 w-auto"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="flex items-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-[#008751] block"
              animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </motion.div>
      </div>
    );
  }

  // ── Password reset screen (shown after user clicks reset link) ────────────
  if (showPasswordReset) {
    return (
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<div className="min-h-screen bg-[#F7F9F7] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#008751] border-t-transparent rounded-full animate-spin" /></div>}>
          <ResetPasswordPage
            addToast={addToast}
            onSuccess={async () => {
              // updateUser already re-logs them in; load profile then go to dashboard
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  const profile = await getOrCreateUserProfile(session.user.id, session.user.email || '');
                  setCurrentUser(session.user);
                  setUserProfile(profile);
                  setIsAdminMode(profile.role === 'admin');
                  // Only navigate to dashboard once the profile is confirmed
                  setShowPasswordReset(false);
                  setCurrentPage('dashboard');
                } else {
                  // Session unexpectedly gone — send back to sign-in
                  addToast('Password updated — please sign in.', 'success');
                  setShowPasswordReset(false);
                  setCurrentPage('auth');
                }
              } catch (err) {
                console.error('Profile load after reset:', err);
                addToast('Password updated but profile load failed. Please sign in.', 'error');
                setShowPasswordReset(false);
                setCurrentPage('auth');
              }
            }}
          />
        </Suspense>
        <Notification toasts={toasts} onClose={removeToast} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
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
            bulletinCount={bulletinCount}
            onBellClick={() => setMobileBulletinOpen(true)}
          />
        )}

        <AnimatePresence mode="wait">
          {currentPage === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <LandingPage
                announcements={announcements}
                settings={settings}
                liveNgnRate={liveNgnRate}
                onNavigate={navigateToPage}
              />
            </motion.div>
          )}

          {currentPage === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Suspense fallback={<div className="min-h-screen bg-[#F7F9F7] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#008751] border-t-transparent rounded-full animate-spin" /></div>}>
                <AuthPage
                  onBack={() => setCurrentPage('landing')}
                  onAuthSuccess={() => setCurrentPage('dashboard')}
                  addToast={addToast}
                  initialMode={authInitialMode}
                />
              </Suspense>
            </motion.div>
          )}

          {currentPage === 'dashboard' && userProfile && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
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
                    hasMoreDisputes={hasMoreDisputes}
                    onLoadMoreDisputes={loadMoreDisputes}
                    liveNgnRate={liveNgnRate}
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
                    hasMoreDisputes={hasMoreDisputes}
                    onLoadMoreDisputes={loadMoreDisputes}
                    liveNgnRate={liveNgnRate}
                    addToast={addToast}
                    onRefresh={handleDatabaseRefresh}
                    mobileBulletinOpen={mobileBulletinOpen}
                    onCloseMobileBulletin={() => setMobileBulletinOpen(false)}
                    onBulletinCountChange={setBulletinCount}
                  />
                )}
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Notification toasts={toasts} onClose={removeToast} />
    </div>
    </MotionConfig>
  );
}

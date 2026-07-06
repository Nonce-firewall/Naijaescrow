import { supabase } from './supabase';
import { UserProfile, KYCData, Order, AdminSettings, Announcement, CoinListing, Dispute, NotificationPreferences } from '../types';

export const DEFAULT_SETTINGS: AdminSettings = {
  ngnBankName: 'Zenith Bank',
  ngnAccountNumber: '1012345678',
  ngnAccountName: '9ija Escrow Ltd.',
  usdtRate: 1540,
  wallets: {
    BSC: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
    Tron: 'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
    Polygon: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
  }
};

export async function ensureDefaultSettings() {
  try {
    const { data } = await supabase.from('settings').select('*').eq('id', 'admin_settings').single();
    if (!data) {
      await supabase.from('settings').insert({
        id: 'admin_settings',
        ngn_bank_name: DEFAULT_SETTINGS.ngnBankName,
        ngn_account_number: DEFAULT_SETTINGS.ngnAccountNumber,
        ngn_account_name: DEFAULT_SETTINGS.ngnAccountName,
        usdt_rate: DEFAULT_SETTINGS.usdtRate,
        wallet_bsc: DEFAULT_SETTINGS.wallets.BSC,
        wallet_tron: DEFAULT_SETTINGS.wallets.Tron,
        wallet_polygon: DEFAULT_SETTINGS.wallets.Polygon
      });
    }
  } catch (err) {
    console.error('Error seeding default settings:', err);
  }
}

export async function ensureDefaultAnnouncements() {
  try {
    const { data } = await supabase.from('announcements').select('id').limit(1);
    if (!data || data.length === 0) {
      const now = Date.now();
      await supabase.from('announcements').insert([
        {
          title: 'System Upgrade Notice',
          content: 'We have updated our Polygon USDT wallet addresses. Please ensure you send payments to the newly displayed address to avoid loss of funds.',
          scope: 'all',
          is_active: true,
          created_at: now - 3600000 * 2
        },
        {
          title: 'Welcome to 9ija Escrow',
          content: 'Trade securely with local bank transfers and instant blockchain execution. Fast, secure, and fully verified.',
          scope: 'public',
          is_active: true,
          created_at: now - 3600000 * 24
        },
        {
          title: 'KYC Notice for All Users',
          content: 'In compliance with financial regulations, all traders must complete their KYC verification. It takes less than 3 minutes to verify your identity.',
          scope: 'private',
          is_active: true,
          created_at: now - 3600000 * 4
        }
      ]);
    }
  } catch (err) {
    console.error('Error seeding announcements:', err);
  }
}

export async function ensureDefaultCoins() {
  try {
    const { data } = await supabase.from('coins').select('id').limit(1);
    if (!data || data.length === 0) {
      const now = Date.now();
      await supabase.from('coins').insert([
        {
          name: 'USDT (BSC)',
          symbol: 'USDT',
          network: 'BSC (BEP20)',
          wallet_address: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
          rate: 1540,
          logo_url: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=040',
          published: true,
          created_at: now
        },
        {
          name: 'USDT (Tron)',
          symbol: 'USDT',
          network: 'Tron (TRC20)',
          wallet_address: 'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
          rate: 1540,
          logo_url: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=040',
          published: true,
          created_at: now - 1
        },
        {
          name: 'USDT (Polygon)',
          symbol: 'USDT',
          network: 'Polygon',
          wallet_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          rate: 1540,
          logo_url: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=040',
          published: true,
          created_at: now - 2
        }
      ]);
    }
  } catch (err) {
    console.error('Error seeding default coins:', err);
  }
}

export function rowToSettings(row: any): AdminSettings {
  return {
    ngnBankName: row.ngn_bank_name,
    ngnAccountNumber: row.ngn_account_number,
    ngnAccountName: row.ngn_account_name,
    usdtRate: row.usdt_rate,
    wallets: {
      BSC: row.wallet_bsc,
      Tron: row.wallet_tron,
      Polygon: row.wallet_polygon
    }
  };
}

export function rowToUserProfile(row: any): UserProfile {
  return {
    uid: row.id,
    email: row.email,
    role: row.role,
    kycStatus: row.kyc_status,
    kycData: row.kyc_data || undefined,
    accountStatus: row.account_status || 'active',
    suspendReason: row.suspend_reason || undefined,
    terminateReason: row.terminate_reason || undefined,
    notificationPreferences: row.notification_preferences || undefined,
    createdAt: row.created_at,
    deletedAt: row.deleted_at || undefined
  };
}

export function rowToOrder(row: any): Order {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    type: row.type,
    cryptoAmount: row.crypto_amount,
    ngnAmount: row.ngn_amount,
    rate: row.rate,
    status: row.status,
    network: row.network,
    token: row.token,
    paymentScreenshot: row.payment_screenshot,
    userBankDetails: row.user_bank_details || undefined,
    adminBankDetails: row.admin_bank_details || undefined,
    adminWalletAddress: row.admin_wallet_address || undefined,
    blockchainTxId: row.blockchain_tx_id || undefined,
    rejectionReason: row.rejection_reason || undefined,
    createdAt: row.created_at,
    processedAt: row.processed_at || undefined
  };
}

export function rowToAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    scope: row.scope,
    isActive: row.is_active,
    createdAt: row.created_at
  };
}

export function rowToCoin(row: any): CoinListing {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    network: row.network,
    walletAddress: row.wallet_address,
    rate: row.rate,
    logoUrl: row.logo_url || undefined,
    published: row.published,
    feePercentage: row.fee_percentage ?? 0,
    minTradeAmount: row.min_trade_amount ?? 1,
    createdAt: row.created_at
  };
}

export function rowToDispute(row: any): Dispute {
  const imageUrls: string[] = (() => {
    if (row.image_urls) {
      try { return JSON.parse(row.image_urls) as string[]; } catch { return []; }
    }
    if (row.image_url) return [row.image_url];
    return [];
  })();
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    userEmail: row.user_email,
    message: row.message,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    status: row.status,
    adminResponse: row.admin_response || undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined
  };
}

export async function getOrCreateUserProfile(uid: string, email: string): Promise<UserProfile> {
  const isAdmin = email.toLowerCase() === 'cryptogangstar247@gmail.com';

  // Select only the columns needed by rowToUserProfile — avoids pulling unused data.
  const USER_COLS = 'id,email,role,kyc_status,kyc_data,account_status,suspend_reason,terminate_reason,notification_preferences,created_at,deleted_at';

  const { data: existing } = await supabase.from('users').select(USER_COLS).eq('id', uid).single();

  if (existing) {
    if (isAdmin && existing.role !== 'admin') {
      await supabase.from('users').update({ role: 'admin' }).eq('id', uid);
      existing.role = 'admin';
    }
    return rowToUserProfile(existing);
  }

  const newRow = {
    id: uid,
    email,
    role: isAdmin ? 'admin' : 'user',
    kyc_status: isAdmin ? 'approved' : 'none',
    account_status: 'active',
    created_at: Date.now()
  };

  const { data: inserted, error: insertError } = await supabase.from('users').insert(newRow).select(USER_COLS).single();
  if (inserted) return rowToUserProfile(inserted);

  // PostgreSQL unique-violation (23505) means a concurrent call already inserted the row — safe to fetch.
  // Any other error code is a real failure (RLS denied, schema mismatch, network) — surface it.
  if (insertError && insertError.code !== '23505') {
    throw new Error(`Could not create user profile: ${insertError.message}`);
  }

  // Race-condition retry: the concurrent insert won, so the row must now exist.
  const { data: retried, error: retryError } = await supabase.from('users').select(USER_COLS).eq('id', uid).single();
  if (retried) return rowToUserProfile(retried);

  throw new Error(`Failed to retrieve user profile after insert race: ${retryError?.message ?? 'unknown'}`);
}

export async function submitKYC(uid: string, kycData: Omit<KYCData, 'submittedAt'>) {
  const fullKYC: KYCData = { ...kycData, submittedAt: Date.now() };
  const { error } = await supabase.from('users').update({
    kyc_status: 'pending',
    kyc_data: fullKYC
  }).eq('id', uid);
  if (error) throw new Error(error.message);
}

export async function handleKYCReview(uid: string, approve: boolean, rejectionReason?: string) {
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('kyc_data')
    .eq('id', uid)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  const kycData = existing?.kyc_data || {};
  const updatedKyc = {
    ...kycData,
    reviewedAt: Date.now(),
    rejectionReason: approve ? '' : (rejectionReason || '')
  };
  const { error } = await supabase.from('users').update({
    kyc_status: approve ? 'approved' : 'rejected',
    kyc_data: updatedKyc
  }).eq('id', uid);
  if (error) throw new Error(error.message);
}

export async function createOrder(
  userId: string,
  userEmail: string,
  type: 'buy' | 'sell',
  cryptoAmount: number,
  rate: number,
  network: string,
  paymentScreenshot: string,
  userBankDetails?: Order['userBankDetails'],
  adminBankDetails?: Order['adminBankDetails'],
  adminWalletAddress?: string,
  token: string = 'USDT',
  blockchainTxId?: string
) {
  const ngnAmount = cryptoAmount * rate;
  const { data, error } = await supabase.from('orders').insert({
    user_id: userId,
    user_email: userEmail,
    type,
    crypto_amount: cryptoAmount,
    ngn_amount: ngnAmount,
    rate,
    status: 'pending',
    network,
    token,
    payment_screenshot: paymentScreenshot,
    user_bank_details: userBankDetails || null,
    admin_bank_details: adminBankDetails || null,
    admin_wallet_address: adminWalletAddress || null,
    blockchain_tx_id: blockchainTxId || null,
    created_at: Date.now()
  }).select().single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function processOrder(
  orderId: string,
  status: 'completed' | 'rejected',
  blockchainTxId?: string,
  rejectionReason?: string
) {
  const updates: any = { status, processed_at: Date.now() };
  if (status === 'completed' && blockchainTxId) updates.blockchain_tx_id = blockchainTxId;
  if (status === 'rejected' && rejectionReason) updates.rejection_reason = rejectionReason;
  const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
  if (error) throw new Error(error.message);
}

export async function updateAdminSettings(settings: AdminSettings) {
  const { error } = await supabase.from('settings').upsert({
    id: 'admin_settings',
    ngn_bank_name: settings.ngnBankName,
    ngn_account_number: settings.ngnAccountNumber,
    ngn_account_name: settings.ngnAccountName,
    usdt_rate: settings.usdtRate,
    wallet_bsc: settings.wallets.BSC,
    wallet_tron: settings.wallets.Tron,
    wallet_polygon: settings.wallets.Polygon
  });
  if (error) throw new Error(error.message);
}

export async function createAnnouncement(ann: Omit<Announcement, 'id' | 'createdAt'>) {
  const { error } = await supabase.from('announcements').insert({
    title: ann.title,
    content: ann.content,
    scope: ann.scope,
    is_active: ann.isActive,
    created_at: Date.now()
  });
  if (error) throw new Error(error.message);
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateAnnouncement(id: string, fields: { title?: string; content?: string; scope?: string; is_active?: boolean }) {
  const { error } = await supabase.from('announcements').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function hardDeleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createCoinListing(coin: Omit<CoinListing, 'id' | 'createdAt'>) {
  const { error } = await supabase.from('coins').insert({
    name: coin.name,
    symbol: coin.symbol,
    network: coin.network,
    wallet_address: coin.walletAddress,
    rate: coin.rate,
    logo_url: coin.logoUrl || null,
    published: true,
    fee_percentage: coin.feePercentage ?? 0,
    min_trade_amount: coin.minTradeAmount ?? 1,
    created_at: Date.now()
  });
  if (error) throw new Error(error.message);
}

export async function updateCoinFees(id: string, feePercentage: number, minTradeAmount: number) {
  const { error } = await supabase.from('coins').update({
    fee_percentage: feePercentage,
    min_trade_amount: minTradeAmount
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCoinListing(id: string) {
  const { error } = await supabase.from('coins').update({ published: false }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleCoinPublish(id: string, published: boolean) {
  const { error } = await supabase.from('coins').update({ published }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateUserAdminAction(uid: string, fields: Partial<UserProfile>) {
  const updates: any = {};
  if (fields.role !== undefined) updates.role = fields.role;
  if (fields.kycStatus !== undefined) updates.kyc_status = fields.kycStatus;
  if (fields.kycData !== undefined) updates.kyc_data = fields.kycData ?? null;
  if (fields.accountStatus !== undefined) updates.account_status = fields.accountStatus;
  if (fields.suspendReason !== undefined) updates.suspend_reason = fields.suspendReason;
  if (fields.terminateReason !== undefined) updates.terminate_reason = fields.terminateReason;
  const { error } = await supabase.from('users').update(updates).eq('id', uid);
  if (error) throw new Error(error.message);
}

export async function suspendUser(uid: string, reason: string) {
  const { error } = await supabase.from('users').update({
    account_status: 'suspended',
    suspend_reason: reason
  }).eq('id', uid);
  if (error) throw new Error(error.message);
}

export async function terminateUser(uid: string, reason: string) {
  const { error } = await supabase.from('users').update({
    account_status: 'terminated',
    terminate_reason: reason
  }).eq('id', uid);
  if (error) throw new Error(error.message);
}

export async function updateNotificationPreferences(uid: string, prefs: NotificationPreferences) {
  const { error } = await supabase.from('users').update({
    notification_preferences: prefs
  }).eq('id', uid);
  if (error) throw new Error(error.message);
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

// Permanently deletes the caller's own auth account and scrubs their profile,
// while retaining KYC records (kyc_status/kyc_data) for fraud/legal purposes.
// Actual deletion happens server-side in the `delete-account` Netlify
// Function, since removing an auth user requires the service-role key which
// must never be exposed to the browser. See netlify/functions/delete-account.mts.
export async function deleteAccount() {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('You must be signed in to delete your account.');

  const response = await fetch('/api/delete-account', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to delete account.');
}

export async function reinstateUser(uid: string) {
  const { error } = await supabase.from('users').update({
    account_status: 'active',
    suspend_reason: null,
    terminate_reason: null
  }).eq('id', uid);
  if (error) throw new Error(error.message);
}

export async function submitDispute(orderId: string, userId: string, userEmail: string, message: string, imageUrls?: string[]) {
  const { error } = await supabase.from('disputes').insert({
    order_id: orderId,
    user_id: userId,
    user_email: userEmail,
    message,
    image_urls: imageUrls && imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
    status: 'open',
    created_at: Date.now()
  });
  if (error) throw new Error(error.message);
}

export interface PublicStats {
  tradesCompleted: number;
  usdtVolume: number;
  activeTraders: number;
}

export async function getPublicStats(): Promise<PublicStats> {
  // Uses a SECURITY DEFINER RPC function so that RLS on the orders table
  // does not block anonymous visitors — only aggregate totals are returned,
  // no individual row data is exposed.
  const { data, error } = await supabase.rpc('get_public_stats');
  if (error) throw new Error(error.message);
  return {
    tradesCompleted: data?.trades_completed  ?? 0,
    usdtVolume:      data?.usdt_volume       ?? 0,
    activeTraders:   data?.active_traders    ?? 0,
  };
}

export async function resolveDispute(disputeId: string, adminResponse: string) {
  const { error } = await supabase.from('disputes').update({
    status: 'resolved',
    admin_response: adminResponse,
    resolved_at: Date.now()
  }).eq('id', disputeId);
  if (error) throw new Error(error.message);
}

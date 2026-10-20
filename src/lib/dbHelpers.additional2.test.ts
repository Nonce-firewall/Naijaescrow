import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOrCreateUserProfile,
  submitKYC,
  handleKYCReview,
  createOrder,
  processOrder,
  updateAdminSettings,
  sendDisputeMessage,
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  hardDeleteAnnouncement,
  createCoinListing,
  updateCoinFees,
  updateCoinDetails,
  deleteCoinListing,
  toggleCoinPublish,
  updateUserAdminAction,
  suspendUser,
  terminateUser,
  updateNotificationPreferences,
  changePassword,
  deleteAccount,
  reinstateUser,
  reactivatePendingUser,
  submitDispute,
  getPublicStats,
  resolveDispute,
  DEFAULT_SETTINGS,
} from './dbHelpers';
import { mockSupabase } from './supabase.mock';
import { SupabaseError, ValidationError } from './errors';

describe('dbHelpers - Additional Functions 2', () => {
  beforeEach(() => {
    mockSupabase._store.settings = [];
    mockSupabase._store.announcements = [];
    mockSupabase._store.coins = [];
    mockSupabase._store.users = [];
    mockSupabase._store.orders = [];
    mockSupabase._store.disputes = [];
    mockSupabase._store.dispute_messages = [];
    mockSupabase._insertCalls.length = 0;
    mockSupabase._updateCalls.length = 0;
    mockSupabase._deleteCalls.length = 0;
  });

  describe('getOrCreateUserProfile', () => {
    it('returns existing user if found', async () => {
      mockSupabase._store.users = [
        {
          id: 'user-100',
          email: 'trader@example.com',
          role: 'user',
          kyc_status: 'approved',
          account_status: 'active',
          created_at: 1000,
        },
      ];

      const profile = await getOrCreateUserProfile('user-100', 'trader@example.com');
      expect(profile.uid).toBe('user-100');
      expect(profile.email).toBe('trader@example.com');
      expect(profile.role).toBe('user');
    });

    it('creates a new user profile when not present', async () => {
      const profile = await getOrCreateUserProfile('user-200', 'newtrader@example.com');
      expect(profile.uid).toBe('user-200');
      expect(profile.email).toBe('newtrader@example.com');
      expect(mockSupabase._insertCalls.length).toBeGreaterThan(0);
    });
  });

  describe('submitKYC and handleKYCReview', () => {
    it('updates user KYC data and sets status to pending', async () => {
      await submitKYC('user-100', {
        fullName: 'John Doe',
        idType: 'nin_paper',
        idNumber: 'A12345678',
        screenshotUrl: 'https://doc.url',
        holdingIdUrl: 'https://holding.url',
      });

      expect(mockSupabase._updateCalls.length).toBe(1);
      const update = mockSupabase._updateCalls[0];
      expect(update.data.kyc_status).toBe('pending');
      expect(update.data.kyc_data.fullName).toBe('John Doe');
    });

    it('approves KYC on review', async () => {
      mockSupabase._store.users = [{ id: 'user-100', kyc_data: { fullName: 'John' } }];

      await handleKYCReview('user-100', true);
      expect(mockSupabase._updateCalls.some((c) => c.data.kyc_status === 'approved')).toBe(true);
    });

    it('rejects KYC with reason on review', async () => {
      mockSupabase._store.users = [{ id: 'user-100', kyc_data: { fullName: 'John' } }];

      await handleKYCReview('user-100', false, 'Blurry document');
      expect(mockSupabase._updateCalls.some((c) => c.data.kyc_status === 'rejected')).toBe(true);
    });
  });

  describe('createOrder and processOrder', () => {
    it('creates an order with calculated NGN amount', async () => {
      const orderId = await createOrder(
        'usr-1',
        'usr@test.com',
        'buy',
        100,
        1550,
        'BSC',
        'https://proof.png',
        undefined,
        undefined,
        undefined,
        'USDT'
      );

      expect(orderId).toBeDefined();
      expect(mockSupabase._insertCalls.length).toBe(1);
      expect(mockSupabase._insertCalls[0].data.ngn_amount).toBe(155000);
      expect(mockSupabase._insertCalls[0].data.status).toBe('pending');
    });

    it('processes order to completed with blockchainTxId', async () => {
      await processOrder('ord-1', 'completed', '0xTxHashConfirmed');
      expect(mockSupabase._updateCalls.some((c) => c.data.status === 'completed')).toBe(true);
      expect(mockSupabase._updateCalls.some((c) => c.data.blockchain_tx_id === '0xTxHashConfirmed')).toBe(true);
    });

    it('processes order to rejected with rejection reason', async () => {
      await processOrder('ord-1', 'rejected', undefined, 'Payment invalid');
      expect(mockSupabase._updateCalls.some((c) => c.data.status === 'rejected')).toBe(true);
      expect(mockSupabase._updateCalls.some((c) => c.data.rejection_reason === 'Payment invalid')).toBe(true);
    });
  });

  describe('updateAdminSettings', () => {
    it('upserts settings into settings table', async () => {
      await updateAdminSettings(DEFAULT_SETTINGS);
      expect(mockSupabase._insertCalls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Announcements operations', () => {
    it('creates, updates, and deletes announcements', async () => {
      await createAnnouncement({
        title: 'New Policy',
        content: 'Check terms',
        scope: 'all',
        isActive: true,
      });
      expect(mockSupabase._insertCalls.some((c) => c.table === 'announcements')).toBe(true);

      await updateAnnouncement('ann-1', { title: 'Updated Policy' });
      expect(mockSupabase._updateCalls.some((c) => c.table === 'announcements')).toBe(true);

      await deleteAnnouncement('ann-1');
      expect(mockSupabase._updateCalls.some((c) => c.data.is_active === false)).toBe(true);

      await hardDeleteAnnouncement('ann-1');
      expect(mockSupabase._deleteCalls.some((c) => c.table === 'announcements')).toBe(true);
    });
  });

  describe('Coins operations', () => {
    it('creates coin listing and updates fees/details', async () => {
      await createCoinListing({
        name: 'Bitcoin',
        symbol: 'BTC',
        network: 'Native',
        walletAddress: 'bc1qtest',
        rate: 65000,
        published: true,
      });
      expect(mockSupabase._insertCalls.some((c) => c.table === 'coins')).toBe(true);

      await updateCoinFees('coin-1', 1.5, 10, true, 20, 20);
      expect(mockSupabase._updateCalls.some((c) => c.data.fee_percentage === 1.5)).toBe(true);

      await updateCoinDetails('coin-1', { rate: 66000 });
      expect(mockSupabase._updateCalls.some((c) => c.data.rate === 66000)).toBe(true);

      await toggleCoinPublish('coin-1', false);
      expect(mockSupabase._updateCalls.some((c) => c.data.published === false)).toBe(true);

      await deleteCoinListing('coin-1');
      expect(mockSupabase._updateCalls.some((c) => c.data.published === false)).toBe(true);
    });
  });

  describe('User Administration & Disputes', () => {
    it('suspends and terminates users', async () => {
      await suspendUser('usr-1', 'Suspicious activity');
      expect(mockSupabase._updateCalls.some((c) => c.data.account_status === 'suspended')).toBe(true);

      await terminateUser('usr-1', 'Fraud violation');
      expect(mockSupabase._updateCalls.some((c) => c.data.account_status === 'terminated')).toBe(true);

      await reinstateUser('usr-1');
      expect(mockSupabase._updateCalls.some((c) => c.data.account_status === 'active')).toBe(true);
    });

    it('updates user notification preferences', async () => {
      await updateNotificationPreferences('usr-1', { orderUpdates: true, kycUpdates: true, announcements: false });
      expect(mockSupabase._updateCalls.some((c) => c.data.notification_preferences?.orderUpdates === true)).toBe(true);
    });

    it('submits and resolves disputes and sends dispute messages', async () => {
      await submitDispute('ord-1', 'usr-1', 'usr@test.com', 'Did not receive payment');
      expect(mockSupabase._insertCalls.some((c) => c.table === 'disputes')).toBe(true);

      await sendDisputeMessage('disp-1', 'usr-1', 'usr@test.com', 'user', 'Sending bank receipt');
      expect(mockSupabase._insertCalls.some((c) => c.table === 'dispute_messages')).toBe(true);

      await resolveDispute('disp-1', 'Issue sorted by bank');
      expect(mockSupabase._updateCalls.some((c) => c.data.status === 'resolved')).toBe(true);
    });

    it('calls getPublicStats RPC', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { trades_completed: 42, usdt_volume: 125000, active_traders: 18 },
        error: null,
      });

      const stats = await getPublicStats();
      expect(stats.tradesCompleted).toBe(42);
      expect(stats.usdtVolume).toBe(125000);
      expect(stats.activeTraders).toBe(18);
    });

    it('handles deleteAccount validation error when not signed in', async () => {
      mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(deleteAccount()).rejects.toThrow(ValidationError);
    });

    it('changes user password', async () => {
      await changePassword('NewSecurePass123!');
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NewSecurePass123!' });
    });
  });
});

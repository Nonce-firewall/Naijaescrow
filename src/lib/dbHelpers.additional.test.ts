import { describe, it, expect, beforeEach } from 'vitest';
import {
  rowToOrder,
  rowToAnnouncement,
  rowToCoin,
  rowToDispute,
  ensureDefaultSettings,
  ensureDefaultAnnouncements,
  ensureDefaultCoins,
  DEFAULT_SETTINGS,
} from './dbHelpers';
import { mockSupabase } from './supabase.mock';

describe('dbHelpers - Additional Mappers & Database Initializers', () => {
  beforeEach(() => {
    mockSupabase._store.settings = [];
    mockSupabase._store.announcements = [];
    mockSupabase._store.coins = [];
    mockSupabase._insertCalls.length = 0;
  });

  describe('rowToOrder', () => {
    it('correctly maps a complete database order row to Order object', () => {
      const row = {
        id: 'ord-123',
        user_id: 'usr-456',
        user_email: 'trader@example.com',
        type: 'buy',
        crypto_amount: 250,
        ngn_amount: 375000,
        rate: 1500,
        status: 'pending',
        network: 'BSC',
        token: 'USDT',
        payment_screenshot: 'https://storage/proof.jpg',
        user_bank_details: { bank: 'GTBank', account: '0123456789' },
        admin_bank_details: { bank: 'Zenith', account: '1012345678' },
        admin_wallet_address: '0xAdminWallet',
        user_wallet_address: '0xUserWallet',
        blockchain_tx_id: '0xTxHash123',
        rejection_reason: null,
        created_at: 1700000000,
        processed_at: 1700003600,
        usdt_equivalent: 250,
      };

      const order = rowToOrder(row);

      expect(order).toEqual({
        id: 'ord-123',
        userId: 'usr-456',
        userEmail: 'trader@example.com',
        type: 'buy',
        cryptoAmount: 250,
        ngnAmount: 375000,
        rate: 1500,
        status: 'pending',
        network: 'BSC',
        token: 'USDT',
        paymentScreenshot: 'https://storage/proof.jpg',
        userBankDetails: { bank: 'GTBank', account: '0123456789' },
        adminBankDetails: { bank: 'Zenith', account: '1012345678' },
        adminWalletAddress: '0xAdminWallet',
        userWalletAddress: '0xUserWallet',
        blockchainTxId: '0xTxHash123',
        rejectionReason: undefined,
        createdAt: 1700000000,
        processedAt: 1700003600,
        usdtEquivalent: 250,
      });
    });

    it('gracefully handles missing optional fields', () => {
      const minimalRow = {
        id: 'ord-min',
        user_id: 'usr-min',
        user_email: 'min@example.com',
        type: 'sell',
        crypto_amount: 50,
        ngn_amount: 75000,
        rate: 1500,
        status: 'completed',
        network: 'Tron',
        token: 'USDT',
        payment_screenshot: 'proof.jpg',
        created_at: 1700000000,
      };

      const order = rowToOrder(minimalRow);
      expect(order.id).toBe('ord-min');
      expect(order.userBankDetails).toBeUndefined();
      expect(order.adminWalletAddress).toBeUndefined();
      expect(order.processedAt).toBeUndefined();
    });
  });

  describe('rowToAnnouncement', () => {
    it('correctly maps an announcement row', () => {
      const row = {
        id: 'ann-1',
        title: 'Maintenance Update',
        content: 'Scheduled system maintenance on Sunday.',
        scope: 'all',
        is_active: true,
        created_at: 1700000000,
      };

      const announcement = rowToAnnouncement(row);
      expect(announcement).toEqual({
        id: 'ann-1',
        title: 'Maintenance Update',
        content: 'Scheduled system maintenance on Sunday.',
        scope: 'all',
        isActive: true,
        createdAt: 1700000000,
      });
    });
  });

  describe('rowToCoin', () => {
    it('correctly maps a coin row with price pegging and limits', () => {
      const row = {
        id: 'coin-1',
        name: 'Bitcoin',
        symbol: 'BTC',
        network: 'Native',
        wallet_address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        rate: 95000000,
        logo_url: 'https://example.com/btc.png',
        published: true,
        price_pegged: true,
        fee_percentage: 1.5,
        min_trade_amount: 10,
        min_buy_amount: 15,
        min_sell_amount: 20,
        coin_gecko_id: 'bitcoin',
        created_at: 1700000000,
      };

      const coin = rowToCoin(row);
      expect(coin).toEqual({
        id: 'coin-1',
        name: 'Bitcoin',
        symbol: 'BTC',
        network: 'Native',
        walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        rate: 95000000,
        logoUrl: 'https://example.com/btc.png',
        published: true,
        pricePegged: true,
        feePercentage: 1.5,
        minTradeAmount: 10,
        minBuyAmount: 15,
        minSellAmount: 20,
        coinGeckoId: 'bitcoin',
        createdAt: 1700000000,
      });
    });

    it('falls back to default min trade values if omitted', () => {
      const row = {
        id: 'coin-default',
        name: 'Litecoin',
        symbol: 'LTC',
        network: 'LTC',
        wallet_address: 'LtcAddress',
        rate: 100000,
        published: true,
        created_at: 1700000000,
      };

      const coin = rowToCoin(row);
      expect(coin.pricePegged).toBe(false);
      expect(coin.feePercentage).toBe(0);
      expect(coin.minTradeAmount).toBe(1);
      expect(coin.minBuyAmount).toBe(1);
      expect(coin.minSellAmount).toBe(1);
      expect(coin.logoUrl).toBeUndefined();
    });
  });

  describe('rowToDispute', () => {
    it('parses JSON image_urls if provided', () => {
      const row = {
        id: 'disp-1',
        order_id: 'ord-1',
        user_id: 'usr-1',
        user_email: 'user@example.com',
        message: 'Payment not received',
        image_urls: JSON.stringify(['https://img1.png', 'https://img2.png']),
        status: 'open',
        admin_response: null,
        created_at: 1700000000,
        resolved_at: null,
      };

      const dispute = rowToDispute(row);
      expect(dispute.imageUrls).toEqual(['https://img1.png', 'https://img2.png']);
      expect(dispute.status).toBe('open');
      expect(dispute.adminResponse).toBeUndefined();
    });

    it('supports single image_url fallback string', () => {
      const row = {
        id: 'disp-legacy',
        order_id: 'ord-2',
        user_id: 'usr-2',
        user_email: 'user2@example.com',
        message: 'Need help',
        image_url: 'https://single-img.png',
        status: 'resolved',
        admin_response: 'Refund issued',
        created_at: 1700000000,
        resolved_at: 1700005000,
      };

      const dispute = rowToDispute(row);
      expect(dispute.imageUrls).toEqual(['https://single-img.png']);
      expect(dispute.adminResponse).toBe('Refund issued');
      expect(dispute.resolvedAt).toBe(1700005000);
    });
  });

  describe('Database Initializers with Mock Supabase', () => {
    it('ensureDefaultSettings inserts default settings when absent', async () => {
      await ensureDefaultSettings();

      expect(mockSupabase._insertCalls.length).toBe(1);
      const insert = mockSupabase._insertCalls.find(c => c.table === 'settings');
      expect(insert).toBeDefined();
      expect(insert?.data).toMatchObject({
        id: 'admin_settings',
        ngn_bank_name: DEFAULT_SETTINGS.ngnBankName,
        ngn_account_number: DEFAULT_SETTINGS.ngnAccountNumber,
        ngn_account_name: DEFAULT_SETTINGS.ngnAccountName,
        usdt_sell_markup: DEFAULT_SETTINGS.usdtSellMarkup,
        usdt_buy_markup: DEFAULT_SETTINGS.usdtBuyMarkup,
        wallet_bsc: DEFAULT_SETTINGS.wallets.BSC,
      });
    });

    it('ensureDefaultAnnouncements inserts default announcements when absent', async () => {
      await ensureDefaultAnnouncements();

      const insert = mockSupabase._insertCalls.find(c => c.table === 'announcements');
      expect(insert).toBeDefined();
      expect(Array.isArray(insert?.data)).toBe(true);
      expect(insert?.data.length).toBeGreaterThanOrEqual(3);
    });

    it('ensureDefaultCoins inserts default coin listings when absent', async () => {
      await ensureDefaultCoins();

      const insert = mockSupabase._insertCalls.find(c => c.table === 'coins');
      expect(insert).toBeDefined();
      expect(Array.isArray(insert?.data)).toBe(true);
      expect(insert?.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});

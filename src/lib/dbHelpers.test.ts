import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  rowToSettings,
  rowToUserProfile,
  rowToOrder,
  rowToAnnouncement,
  rowToCoin,
  rowToDispute,
  DEFAULT_SETTINGS,
} from './dbHelpers';

describe('dbHelpers', () => {
  describe('rowToSettings', () => {
    it('should transform database row to AdminSettings object', () => {
      const row = {
        ngn_bank_name: 'First Bank',
        ngn_account_number: '9876543210',
        ngn_account_name: 'Test Account',
        usdt_sell_markup: 150,
        usdt_buy_markup: 120,
        wallet_bsc: '0xBSC123',
        wallet_tron: 'TRON123',
        wallet_polygon: '0xPOLY123',
      };

      const result = rowToSettings(row);

      expect(result).toEqual({
        ngnBankName: 'First Bank',
        ngnAccountNumber: '9876543210',
        ngnAccountName: 'Test Account',
        usdtSellMarkup: 150,
        usdtBuyMarkup: 120,
        wallets: {
          BSC: '0xBSC123',
          Tron: 'TRON123',
          Polygon: '0xPOLY123',
        },
      });
    });

    it('should use DEFAULT_SETTINGS as fallback for missing markup columns', () => {
      const row = {
        ngn_bank_name: 'First Bank',
        ngn_account_number: '9876543210',
        ngn_account_name: 'Test Account',
        usdt_rate: 1600,
        wallet_bsc: '0xBSC123',
        wallet_tron: 'TRON123',
        wallet_polygon: '0xPOLY123',
      };

      const result = rowToSettings(row);

      expect(result.usdtSellMarkup).toBe(1600);
      expect(result.usdtBuyMarkup).toBe(1600);
    });
  });

  describe('rowToUserProfile', () => {
    it('should transform database row to UserProfile object', () => {
      const row = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        kyc_status: 'approved',
        kyc_data: { verified: true },
        account_status: 'active',
        suspend_reason: null,
        terminate_reason: null,
        notification_preferences: { email: true },
        created_at: 1623456789,
        deleted_at: null,
      };

      const result = rowToUserProfile(row);

      expect(result).toEqual({
        uid: 'user-123',
        email: 'test@example.com',
        role: 'user',
        kycStatus: 'approved',
        kycData: { verified: true },
        accountStatus: 'active',
        suspendReason: undefined,
        terminateReason: undefined,
        notificationPreferences: { email: true },
        createdAt: 1623456789,
        deletedAt: undefined,
      });
    });

    it('should use default values for optional fields', () => {
      const row = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        kyc_status: 'none',
        created_at: 1623456789,
      };

      const result = rowToUserProfile(row);

      expect(result.accountStatus).toBe('active');
      expect(result.kycData).toBeUndefined();
      expect(result.suspendReason).toBeUndefined();
    });
  });

  describe('rowToOrder', () => {
    it('should transform database row to Order object', () => {
      const row = {
        id: 'order-123',
        user_id: 'user-123',
        user_email: 'user@example.com',
        type: 'buy',
        crypto_amount: 100,
        ngn_amount: 154000,
        rate: 1540,
        status: 'pending',
        network: 'BSC',
        token: 'USDT',
        payment_screenshot: 'https://example.com/screenshot.png',
        user_bank_details: { bank: 'First Bank', account: '1234567890' },
        admin_bank_details: null,
        admin_wallet_address: null,
        user_wallet_address: null,
        blockchain_tx_id: null,
        rejection_reason: null,
        created_at: 1623456789,
        processed_at: null,
        usdt_equivalent: 100,
      };

      const result = rowToOrder(row);

      expect(result).toEqual({
        id: 'order-123',
        userId: 'user-123',
        userEmail: 'user@example.com',
        type: 'buy',
        cryptoAmount: 100,
        ngnAmount: 154000,
        rate: 1540,
        status: 'pending',
        network: 'BSC',
        token: 'USDT',
        paymentScreenshot: 'https://example.com/screenshot.png',
        userBankDetails: { bank: 'First Bank', account: '1234567890' },
        adminBankDetails: undefined,
        adminWalletAddress: undefined,
        userWalletAddress: undefined,
        blockchainTxId: undefined,
        rejectionReason: undefined,
        createdAt: 1623456789,
        processedAt: undefined,
        usdtEquivalent: 100,
      });
    });
  });

  describe('rowToAnnouncement', () => {
    it('should transform database row to Announcement object', () => {
      const row = {
        id: 'ann-123',
        title: 'System Maintenance',
        content: 'We will be down for maintenance',
        scope: 'public',
        is_active: true,
        created_at: 1623456789,
      };

      const result = rowToAnnouncement(row);

      expect(result).toEqual({
        id: 'ann-123',
        title: 'System Maintenance',
        content: 'We will be down for maintenance',
        scope: 'public',
        isActive: true,
        createdAt: 1623456789,
      });
    });
  });

  describe('rowToCoin', () => {
    it('should transform database row to CoinListing object', () => {
      const row = {
        id: 'coin-123',
        name: 'USDT (BSC)',
        symbol: 'USDT',
        network: 'BSC',
        wallet_address: '0xBSC123',
        rate: 1540,
        logo_url: 'https://example.com/usdt.png',
        published: true,
        price_pegged: true,
        fee_percentage: 0.5,
        min_trade_amount: 100,
        min_buy_amount: 100,
        min_sell_amount: 100,
        coin_gecko_id: 'tether',
        created_at: 1623456789,
      };

      const result = rowToCoin(row);

      expect(result).toEqual({
        id: 'coin-123',
        name: 'USDT (BSC)',
        symbol: 'USDT',
        network: 'BSC',
        walletAddress: '0xBSC123',
        rate: 1540,
        logoUrl: 'https://example.com/usdt.png',
        published: true,
        pricePegged: true,
        feePercentage: 0.5,
        minTradeAmount: 100,
        minBuyAmount: 100,
        minSellAmount: 100,
        coinGeckoId: 'tether',
        createdAt: 1623456789,
      });
    });

    it('should use default values for optional fields', () => {
      const row = {
        id: 'coin-123',
        name: 'USDT',
        symbol: 'USDT',
        network: 'BSC',
        wallet_address: '0xBSC123',
        rate: 1540,
        published: true,
        created_at: 1623456789,
      };

      const result = rowToCoin(row);

      expect(result.pricePegged).toBe(false);
      expect(result.feePercentage).toBe(0);
      expect(result.minTradeAmount).toBe(1);
      expect(result.logoUrl).toBeUndefined();
      expect(result.coinGeckoId).toBeUndefined();
    });
  });

  describe('rowToDispute', () => {
    it('should transform database row to Dispute object', () => {
      const row = {
        id: 'dispute-123',
        order_id: 'order-123',
        user_id: 'user-123',
        user_email: 'user@example.com',
        message: 'Payment issue',
        image_url: 'https://example.com/image.png',
        image_urls: '["https://example.com/image1.png","https://example.com/image2.png"]',
        status: 'open',
        admin_response: null,
        created_at: 1623456789,
        resolved_at: null,
      };

      const result = rowToDispute(row);

      expect(result).toEqual({
        id: 'dispute-123',
        orderId: 'order-123',
        userId: 'user-123',
        userEmail: 'user@example.com',
        message: 'Payment issue',
        imageUrls: ['https://example.com/image1.png', 'https://example.com/image2.png'],
        status: 'open',
        adminResponse: undefined,
        createdAt: 1623456789,
        resolvedAt: undefined,
      });
    });

    it('should handle malformed image_urls JSON gracefully', () => {
      const row = {
        id: 'dispute-123',
        order_id: 'order-123',
        user_id: 'user-123',
        user_email: 'user@example.com',
        message: 'Payment issue',
        image_url: null,
        image_urls: 'invalid json',
        status: 'open',
        admin_response: null,
        created_at: 1623456789,
        resolved_at: null,
      };

      const result = rowToDispute(row);

      expect(result.imageUrls).toBeUndefined();
    });
  });
});

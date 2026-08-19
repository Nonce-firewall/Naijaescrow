import { describe, it, expect } from 'vitest';
import { rowToOrder, rowToSettings, rowToUserProfile } from './dbHelpers';

describe('dbHelpers - Data Transformations', () => {
  describe('rowToSettings', () => {
    it('transforms database row to AdminSettings object', () => {
      const row = {
        id: 'admin_settings',
        ngn_bank_name: 'Zenith Bank',
        ngn_account_number: '1012345678',
        ngn_account_name: '9ija Escrow Ltd.',
        usdt_sell_markup: 100,
        usdt_buy_markup: 80,
        wallet_bsc: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
        wallet_tron: 'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
        wallet_polygon: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      };

      const result = rowToSettings(row);

      expect(result.ngnBankName).toBe('Zenith Bank');
      expect(result.ngnAccountNumber).toBe('1012345678');
      expect(result.usdtSellMarkup).toBe(100);
      expect(result.wallets.BSC).toBe('0x71C7656EC7ab88b098defB751B7401B5f6d1476B');
    });

    it('uses legacy usdt_rate when markup columns missing', () => {
      const row = {
        id: 'admin_settings',
        ngn_bank_name: 'Zenith Bank',
        ngn_account_number: '1012345678',
        ngn_account_name: '9ija Escrow Ltd.',
        usdt_rate: 1550,
        wallet_bsc: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
        wallet_tron: 'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
        wallet_polygon: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      };

      const result = rowToSettings(row);

      expect(result.usdtSellMarkup).toBe(1550);
      expect(result.usdtBuyMarkup).toBe(1550);
    });
  });

  describe('rowToUserProfile', () => {
    it('transforms database row to UserProfile object', () => {
      const row = {
        id: 'user-123',
        email: 'trader@example.com',
        role: 'user',
        kyc_status: 'approved',
        kyc_data: { documentType: 'passport', verified: true },
        account_status: 'active',
        suspend_reason: null,
        terminate_reason: null,
        notification_preferences: { email: true, sms: false },
        created_at: 1692374400000,
        deleted_at: null,
      };

      const result = rowToUserProfile(row);

      expect(result.uid).toBe('user-123');
      expect(result.email).toBe('trader@example.com');
      expect(result.kycStatus).toBe('approved');
      expect(result.accountStatus).toBe('active');
    });

    it('handles undefined optional fields', () => {
      const row = {
        id: 'user-456',
        email: 'newuser@example.com',
        role: 'user',
        kyc_status: 'none',
        created_at: 1692374400000,
      };

      const result = rowToUserProfile(row);

      expect(result.uid).toBe('user-456');
      expect(result.kycData).toBeUndefined();
      expect(result.suspendReason).toBeUndefined();
    });
  });

  describe('rowToOrder', () => {
    it('transforms database row to Order object', () => {
      const row = {
        id: 'order-789',
        user_id: 'user-123',
        user_email: 'trader@example.com',
        type: 'buy',
        crypto_amount: 100,
        ngn_amount: 154000,
        rate: 1540,
        status: 'pending',
        network: 'BSC',
        token: 'USDT',
        payment_screenshot: 'https://example.com/screenshot.png',
        user_bank_details: { bank: 'GTB', account: '1234567890' },
        admin_bank_details: { bank: 'Zenith', account: '1012345678' },
        admin_wallet_address: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
        user_wallet_address: '0x1234567890123456789012345678901234567890',
        blockchain_tx_id: null,
        rejection_reason: null,
        created_at: 1692374400000,
        processed_at: null,
        usdt_equivalent: 100,
      };

      const result = rowToOrder(row);

      expect(result.id).toBe('order-789');
      expect(result.userId).toBe('user-123');
      expect(result.type).toBe('buy');
      expect(result.cryptoAmount).toBe(100);
      expect(result.ngnAmount).toBe(154000);
    });

    it('handles optional fields as undefined', () => {
      const row = {
        id: 'order-456',
        user_id: 'user-789',
        user_email: 'user@example.com',
        type: 'sell',
        crypto_amount: 50,
        ngn_amount: 77000,
        rate: 1540,
        status: 'completed',
        network: 'Polygon',
        token: 'USDT',
        payment_screenshot: 'https://example.com/ss.png',
        created_at: 1692374400000,
      };

      const result = rowToOrder(row);

      expect(result.blockchainTxId).toBeUndefined();
      expect(result.userBankDetails).toBeUndefined();
      expect(result.rejectionReason).toBeUndefined();
    });
  });
});

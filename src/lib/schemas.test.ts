import { describe, it, expect } from 'vitest';
import { OrderSchema, UserProfileSchema, AdminSettingsSchema, AnnouncementSchema, CoinListingSchema, DisputeSchema } from './schemas';
import { formatNGT, formatNGTDate } from './dateUtils';

describe('schemas validation', () => {
  describe('OrderSchema', () => {
    it('validates a valid order', () => {
      const validOrder = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'usr-1',
        userEmail: 'user@test.com',
        type: 'buy',
        cryptoAmount: 100,
        ngnAmount: 150000,
        rate: 1500,
        status: 'pending',
        network: 'BSC',
        token: 'USDT',
        paymentScreenshot: 'https://example.com/shot.png',
        createdAt: Date.now(),
      };

      const result = OrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('fails when required fields are missing or invalid', () => {
      const invalidOrder = {
        id: 'invalid-uuid',
        userEmail: 'not-an-email',
      };

      const result = OrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
    });
  });

  describe('UserProfileSchema', () => {
    it('validates a complete user profile', () => {
      const profile = {
        uid: 'user-abc',
        email: 'trader@escrow.ng',
        role: 'user',
        kycStatus: 'approved',
        accountStatus: 'active',
        createdAt: 1700000000,
      };

      const result = UserProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
    });
  });

  describe('AdminSettingsSchema', () => {
    it('validates complete settings', () => {
      const settings = {
        ngnBankName: 'Zenith Bank',
        ngnAccountNumber: '1012345678',
        ngnAccountName: '9ija Escrow Ltd',
        usdtSellMarkup: 100,
        usdtBuyMarkup: 80,
        wallets: {
          BSC: '0x123',
          Tron: 'TXYZ',
          Polygon: '0x456',
        },
      };

      const result = AdminSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });
  });

  describe('AnnouncementSchema, CoinListingSchema, and DisputeSchema', () => {
    it('validates announcement', () => {
      const ann = {
        id: 'ann-1',
        title: 'Notice',
        content: 'System notice',
        scope: 'all',
        isActive: true,
        createdAt: 123456,
      };
      expect(AnnouncementSchema.safeParse(ann).success).toBe(true);
    });

    it('validates coin listing', () => {
      const coin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Solana',
        symbol: 'SOL',
        network: 'Solana',
        walletAddress: 'SolAddress123',
        rate: 250000,
        published: true,
        createdAt: 123456,
      };
      expect(CoinListingSchema.safeParse(coin).success).toBe(true);
    });

    it('validates dispute', () => {
      const dispute = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'usr-1',
        userEmail: 'user@example.com',
        message: 'Order delayed for more than 24 hours',
        status: 'open',
        createdAt: 123456,
      };
      expect(DisputeSchema.safeParse(dispute).success).toBe(true);
    });
  });
});

describe('dateUtils', () => {
  it('formats timestamp in NGT correctly', () => {
    const ts = new Date('2026-07-15T10:30:00Z').getTime();
    const formatted = formatNGT(ts);
    expect(formatted).toBeDefined();
    expect(formatted).not.toBe('N/A');
    expect(formatted).toContain('2026');
  });

  it('formats date only correctly', () => {
    const ts = new Date('2026-07-15T10:30:00Z').getTime();
    const formattedDate = formatNGTDate(ts);
    expect(formattedDate).toContain('2026');
  });

  it('returns N/A for null/undefined timestamps', () => {
    expect(formatNGT(null)).toBe('N/A');
    expect(formatNGT(undefined)).toBe('N/A');
    expect(formatNGTDate(null)).toBe('N/A');
    expect(formatNGTDate(undefined)).toBe('N/A');
  });
});

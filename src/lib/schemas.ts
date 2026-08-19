import { z } from 'zod';

/**
 * Order validation schema
 * Ensures all order data matches expected types and constraints
 */
export const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  userEmail: z.string().email(),
  type: z.enum(['buy', 'sell']),
  cryptoAmount: z.number().positive(),
  ngnAmount: z.number().positive(),
  rate: z.number().positive(),
  status: z.enum(['pending', 'completed', 'rejected']),
  network: z.enum(['BSC', 'Tron', 'Polygon']),
  token: z.string(),
  paymentScreenshot: z.string().url(),
  userBankDetails: z.object({
    bank: z.string(),
    account: z.string(),
  }).optional(),
  adminBankDetails: z.object({
    bank: z.string(),
    account: z.string(),
  }).optional(),
  adminWalletAddress: z.string().optional(),
  userWalletAddress: z.string().optional(),
  blockchainTxId: z.string().optional(),
  rejectionReason: z.string().optional(),
  createdAt: z.number(),
  processedAt: z.number().optional(),
  usdtEquivalent: z.number().optional(),
});

/**
 * UserProfile validation schema
 * Ensures user data integrity
 */
export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  kycStatus: z.enum(['none', 'pending', 'approved', 'rejected']),
  kycData: z.object({
    documentType: z.string(),
    verified: z.boolean(),
    submittedAt: z.number().optional(),
    reviewedAt: z.number().optional(),
    rejectionReason: z.string().optional(),
  }).optional(),
  accountStatus: z.enum(['active', 'suspended', 'terminated', 'pending_reactivation']),
  suspendReason: z.string().optional(),
  terminateReason: z.string().optional(),
  notificationPreferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
  }).optional(),
  createdAt: z.number(),
  deletedAt: z.number().optional(),
});

/**
 * AdminSettings validation schema
 * Ensures admin configuration integrity
 */
export const AdminSettingsSchema = z.object({
  ngnBankName: z.string(),
  ngnAccountNumber: z.string(),
  ngnAccountName: z.string(),
  usdtSellMarkup: z.number().positive(),
  usdtBuyMarkup: z.number().positive(),
  wallets: z.object({
    BSC: z.string(),
    Tron: z.string(),
    Polygon: z.string(),
  }),
});

/**
 * CoinListing validation schema
 * Ensures cryptocurrency listing data is valid
 */
export const CoinListingSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  symbol: z.string(),
  network: z.string(),
  walletAddress: z.string(),
  rate: z.number().positive(),
  logoUrl: z.string().url().optional(),
  published: z.boolean(),
  pricePegged: z.boolean().default(false),
  feePercentage: z.number().nonnegative().default(0),
  minTradeAmount: z.number().positive().default(1),
  minBuyAmount: z.number().positive().default(1),
  minSellAmount: z.number().positive().default(1),
  coinGeckoId: z.string().optional(),
  createdAt: z.number(),
});

/**
 * Dispute validation schema
 * Ensures dispute data is complete and valid
 */
export const DisputeSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  userId: z.string(),
  userEmail: z.string().email(),
  message: z.string().min(10),
  imageUrls: z.array(z.string().url()).optional(),
  status: z.enum(['open', 'resolved']),
  adminResponse: z.string().optional(),
  createdAt: z.number(),
  resolvedAt: z.number().optional(),
});

/**
 * Type exports for use in application code
 */
export type Order = z.infer<typeof OrderSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type AdminSettings = z.infer<typeof AdminSettingsSchema>;
export type CoinListing = z.infer<typeof CoinListingSchema>;
export type Dispute = z.infer<typeof DisputeSchema>;

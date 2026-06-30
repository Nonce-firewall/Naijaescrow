export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  kycData?: KYCData;
  createdAt: number;
}

export interface KYCData {
  fullName: string;
  idType: 'nin_paper' | 'nin_plastic' | 'voters_card' | 'drivers_license';
  idNumber: string;
  screenshotUrl: string; // base64 representation or simulated image
  holdingIdUrl?: string; // photo holding ID with left hand beside face
  submittedAt: number;
  rejectionReason?: string;
  reviewedAt?: number;
}

export interface CryptoWallet {
  network: 'BSC' | 'Tron' | 'Polygon';
  address: string;
}

export interface AdminSettings {
  ngnBankName: string;
  ngnAccountNumber: string;
  ngnAccountName: string;
  usdtRate: number; // NGN per USDT
  wallets: {
    BSC: string;
    Tron: string;
    Polygon: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  type: 'buy' | 'sell';
  cryptoAmount: number; // USDT
  ngnAmount: number; // NGN
  rate: number; // exchange rate at order creation
  status: 'pending' | 'completed' | 'rejected';
  network: 'BSC' | 'Tron' | 'Polygon' | string;
  token: 'USDT' | string;
  paymentScreenshot: string; // base64 string
  userBankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  }; // Only for 'sell' order
  adminBankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  }; // Copied from settings at the time of 'buy' order
  adminWalletAddress?: string; // Copied from settings at the time of 'sell' order
  blockchainTxId?: string; // Filled by admin
  rejectionReason?: string; // Filled by admin on rejection
  createdAt: number;
  processedAt?: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  scope: 'public' | 'private' | 'all';
  isActive: boolean;
  createdAt: number;
}

export interface CoinListing {
  id: string;
  name: string;
  symbol: string;
  network: string;
  walletAddress: string;
  rate: number;
  logoUrl?: string; // base64 logo upload (supports 512x512)
  published?: boolean; // toggle to hide from users without breaking transactions history
  createdAt: number;
}


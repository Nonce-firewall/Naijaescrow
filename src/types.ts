export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  kycData?: KYCData;
  accountStatus: 'active' | 'suspended' | 'terminated';
  suspendReason?: string;
  terminateReason?: string;
  createdAt: number;
}

export interface KYCData {
  fullName: string;
  idType: 'nin_paper' | 'nin_plastic' | 'voters_card' | 'drivers_license';
  idNumber: string;
  screenshotUrl: string;
  holdingIdUrl?: string;
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
  usdtRate: number;
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
  cryptoAmount: number;
  ngnAmount: number;
  rate: number;
  status: 'pending' | 'completed' | 'rejected';
  network: 'BSC' | 'Tron' | 'Polygon' | string;
  token: 'USDT' | string;
  paymentScreenshot: string;
  userBankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  adminBankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  adminWalletAddress?: string;
  blockchainTxId?: string;
  rejectionReason?: string;
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
  logoUrl?: string;
  published?: boolean;
  createdAt: number;
}

export interface Dispute {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  message: string;
  imageUrl?: string;
  status: 'open' | 'resolved';
  adminResponse?: string;
  createdAt: number;
  resolvedAt?: number;
}

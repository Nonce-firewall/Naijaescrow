export interface NotificationPreferences {
  orderUpdates: boolean;
  kycUpdates: boolean;
  announcements: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  kycData?: KYCData;
  accountStatus: 'active' | 'suspended' | 'terminated' | 'deleted';
  suspendReason?: string;
  terminateReason?: string;
  notificationPreferences?: NotificationPreferences;
  createdAt: number;
  deletedAt?: number;
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
  /** NGN added on top of live market price for SELL orders — also drives hero & dashboard display */
  usdtSellMarkup: number;
  /** NGN added on top of live market price for BUY orders */
  usdtBuyMarkup: number;
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
  userWalletAddress?: string;
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
  /** When true, the coin's price follows the live effective Buy/Sell rate (market + markup) instead of its own static `rate`. */
  pricePegged?: boolean;
  feePercentage?: number;
  minTradeAmount?: number;
  createdAt: number;
}

export interface Dispute {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  message: string;
  imageUrls?: string[];
  status: 'open' | 'resolved';
  adminResponse?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderEmail: string;
  senderRole: 'user' | 'admin';
  message: string;
  createdAt: number;
}

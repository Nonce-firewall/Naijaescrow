import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, KYCData, Order, AdminSettings, Announcement, CoinListing } from '../types';

// Standard fallback settings in case Firebase loading is delayed or empty
export const DEFAULT_SETTINGS: AdminSettings = {
  ngnBankName: 'Zenith Bank',
  ngnAccountNumber: '1012345678',
  ngnAccountName: '9ija Escrow Ltd.',
  usdtRate: 1540, // 1540 NGN per USDT
  wallets: {
    BSC: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
    Tron: 'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
    Polygon: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
  }
};

/**
 * Initialize Default Settings in Database if they don't exist
 */
export async function ensureDefaultSettings() {
  try {
    const settingsRef = doc(db, 'settings', 'admin_settings');
    const snap = await getDoc(settingsRef);
    if (!snap.exists()) {
      await setDoc(settingsRef, DEFAULT_SETTINGS);
      console.log('Default settings seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding default settings:', err);
  }
}

/**
 * Seed sample announcements if none exist
 */
export async function ensureDefaultAnnouncements() {
  try {
    const annColl = collection(db, 'announcements');
    const snap = await getDocs(annColl);
    if (snap.empty) {
      const sampleAnnouncements: Omit<Announcement, 'id'>[] = [
        {
          title: 'System Upgrade Notice',
          content: 'We have updated our Polygon USDT wallet addresses. Please ensure you send payments to the newly displayed address to avoid loss of funds.',
          scope: 'all',
          isActive: true,
          createdAt: Date.now() - 3600000 * 2 // 2 hours ago
        },
        {
          title: 'Welcome to 9ija Escrow',
          content: 'Trade securely with local bank transfers and instant blockchain execution. Fast, secure, and fully verified.',
          scope: 'public',
          isActive: true,
          createdAt: Date.now() - 3600000 * 24 // 1 day ago
        },
        {
          title: 'KYC Notice for All Users',
          content: 'In compliance with financial regulations, all traders must complete their KYC verification. It takes less than 3 minutes to verify your identity.',
          scope: 'private',
          isActive: true,
          createdAt: Date.now() - 3600000 * 4 // 4 hours ago
        }
      ];

      for (const ann of sampleAnnouncements) {
        await addDoc(annColl, ann);
      }
      console.log('Sample announcements seeded.');
    }
  } catch (err) {
    console.error('Error seeding announcements:', err);
  }
}

/**
 * Fetch or create User Profile
 */
export async function getOrCreateUserProfile(uid: string, email: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  
  // Set cryptogangstar247@gmail.com as Admin automatically
  const isAdmin = email.toLowerCase() === 'cryptogangstar247@gmail.com';
  
  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    // Keep admin status synced
    if (isAdmin && data.role !== 'admin') {
      await updateDoc(userRef, { role: 'admin' });
      data.role = 'admin';
    }
    return data;
  }

  const newProfile: UserProfile = {
    uid,
    email,
    role: isAdmin ? 'admin' : 'user',
    kycStatus: isAdmin ? 'approved' : 'none', // Admin automatically approved for testing
    createdAt: Date.now()
  };

  await setDoc(userRef, newProfile);
  return newProfile;
}

/**
 * Update KYC details for User
 */
export async function submitKYC(uid: string, kycData: Omit<KYCData, 'submittedAt'>) {
  const userRef = doc(db, 'users', uid);
  const fullKYC: KYCData = {
    ...kycData,
    submittedAt: Date.now()
  };
  await updateDoc(userRef, {
    kycStatus: 'pending',
    kycData: fullKYC
  });
}

/**
 * Admin action: Approve/Reject KYC
 */
export async function handleKYCReview(uid: string, approve: boolean, rejectionReason?: string) {
  const userRef = doc(db, 'users', uid);
  const updates: any = {
    kycStatus: approve ? 'approved' : 'rejected',
    'kycData.reviewedAt': Date.now()
  };
  if (!approve && rejectionReason) {
    updates['kycData.rejectionReason'] = rejectionReason;
  } else if (approve) {
    // Clear any previous rejection reason
    updates['kycData.rejectionReason'] = '';
  }
  await updateDoc(userRef, updates);
}

/**
 * Submit a Buy or Sell Order
 */
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
  token: string = 'USDT'
) {
  const ordersColl = collection(db, 'orders');
  const ngnAmount = cryptoAmount * rate;
  
  const orderData: Omit<Order, 'id'> = {
    userId,
    userEmail,
    type,
    cryptoAmount,
    ngnAmount,
    rate,
    status: 'pending',
    network,
    token,
    paymentScreenshot,
    createdAt: Date.now()
  };

  if (userBankDetails) orderData.userBankDetails = userBankDetails;
  if (adminBankDetails) orderData.adminBankDetails = adminBankDetails;
  if (adminWalletAddress) orderData.adminWalletAddress = adminWalletAddress;

  const docRef = await addDoc(ordersColl, orderData);
  return docRef.id;
}

/**
 * Admin action: Process Order (Approve / Reject)
 */
export async function processOrder(
  orderId: string, 
  status: 'completed' | 'rejected', 
  blockchainTxId?: string, 
  rejectionReason?: string
) {
  const orderRef = doc(db, 'orders', orderId);
  const updates: any = {
    status,
    processedAt: Date.now()
  };

  if (status === 'completed' && blockchainTxId) {
    updates.blockchainTxId = blockchainTxId;
  }
  if (status === 'rejected' && rejectionReason) {
    updates.rejectionReason = rejectionReason;
  }

  await updateDoc(orderRef, updates);
}

/**
 * Update Admin Settings
 */
export async function updateAdminSettings(settings: AdminSettings) {
  const settingsRef = doc(db, 'settings', 'admin_settings');
  await setDoc(settingsRef, settings);
}

/**
 * Create Announcement
 */
export async function createAnnouncement(ann: Omit<Announcement, 'id' | 'createdAt'>) {
  const annColl = collection(db, 'announcements');
  await addDoc(annColl, {
    ...ann,
    createdAt: Date.now()
  });
}

/**
 * Delete Announcement
 */
export async function deleteAnnouncement(id: string) {
  const annRef = doc(db, 'announcements', id);
  // We can just use updateDoc to mark inactive or delete. Let's delete to keep it simple.
  // Note: we can import deleteDoc if needed. Or updateDoc to deactivate. Let's deactivate it first:
  await updateDoc(annRef, { isActive: false });
}

/**
 * Seed sample coins if none exist
 */
export async function ensureDefaultCoins() {
  try {
    const coinColl = collection(db, 'coins');
    const snap = await getDocs(coinColl);
    if (snap.empty) {
      const defaultCoins = [
        {
          name: 'USDT (BSC)',
          symbol: 'USDT',
          network: 'BSC (BEP20)',
          walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
          rate: 1540,
          logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=040',
          createdAt: Date.now()
        },
        {
          name: 'USDT (Tron)',
          symbol: 'USDT',
          network: 'Tron (TRC20)',
          walletAddress: 'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
          rate: 1540,
          logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=040',
          createdAt: Date.now()
        },
        {
          name: 'USDT (Polygon)',
          symbol: 'USDT',
          network: 'Polygon',
          walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          rate: 1540,
          logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=040',
          createdAt: Date.now()
        }
      ];

      for (const coin of defaultCoins) {
        await addDoc(coinColl, coin);
      }
      console.log('Sample coins seeded.');
    }
  } catch (err) {
    console.error('Error seeding default coins:', err);
  }
}

/**
 * Add a coin listing
 */
export async function createCoinListing(coin: Omit<CoinListing, 'id' | 'createdAt'>) {
  const coinColl = collection(db, 'coins');
  await addDoc(coinColl, {
    ...coin,
    published: true, // Default to published/active
    createdAt: Date.now()
  });
}

/**
 * Delete a coin listing (Soft delete to preserve transaction history)
 */
export async function deleteCoinListing(id: string) {
  const coinRef = doc(db, 'coins', id);
  await updateDoc(coinRef, { published: false });
}

/**
 * Toggle a coin's published/active status
 */
export async function toggleCoinPublish(id: string, published: boolean) {
  const coinRef = doc(db, 'coins', id);
  await updateDoc(coinRef, { published });
}

/**
 * Admin action: Update user profile fields (role or kycStatus) directly
 */
export async function updateUserAdminAction(uid: string, fields: Partial<UserProfile>) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, fields);
}


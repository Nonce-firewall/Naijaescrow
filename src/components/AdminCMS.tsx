import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Layers, 
  Settings, 
  Bell, 
  FileCheck, 
  X, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  CheckSquare, 
  ExternalLink, 
  Wallet, 
  HelpCircle, 
  Clock, 
  Lock, 
  Plus,
  Coins,
  Trash,
  Camera,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile, Order, AdminSettings, Announcement, KYCData, CoinListing } from '../types';
import { 
  processOrder, 
  handleKYCReview, 
  updateAdminSettings, 
  createAnnouncement, 
  deleteAnnouncement,
  createCoinListing,
  deleteCoinListing,
  toggleCoinPublish,
  updateUserAdminAction
} from '../lib/dbHelpers';

interface AdminCMSProps {
  userProfile: UserProfile;
  orders: Order[];
  kycUsers: UserProfile[]; // Users with kycStatus !== 'none'
  settings: AdminSettings;
  announcements: Announcement[];
  coins: CoinListing[];
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export default function AdminCMS({ 
  userProfile, 
  orders, 
  kycUsers, 
  settings, 
  announcements, 
  coins,
  addToast,
  onRefresh
}: AdminCMSProps) {
  
  // Tabs: 'analytics' | 'orders' | 'kyc' | 'settings' | 'bulletins' | 'coins' | 'accounts'
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'kyc' | 'settings' | 'bulletins' | 'coins' | 'accounts'>('analytics');
  
  // Expanded Order for action
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [blockchainTxId, setBlockchainTxId] = useState('');
  const [orderRejectionReason, setOrderRejectionReason] = useState('');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  // Expanded KYC user for action
  const [selectedKycUser, setSelectedKycUser] = useState<UserProfile | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState('');
  const [isProcessingKyc, setIsProcessingKyc] = useState(false);

  // Settings form states
  const [bankName, setBankName] = useState(settings.ngnBankName);
  const [accountNumber, setAccountNumber] = useState(settings.ngnAccountNumber);
  const [accountName, setAccountName] = useState(settings.ngnAccountName);
  const [usdtRate, setUsdtRate] = useState<number>(settings.usdtRate);
  const [bscWallet, setBscWallet] = useState(settings.wallets.BSC);
  const [tronWallet, setTronWallet] = useState(settings.wallets.Tron);
  const [polygonWallet, setPolygonWallet] = useState(settings.wallets.Polygon);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Coin Listing form states
  const [coinName, setCoinName] = useState('');
  const [coinSymbol, setCoinSymbol] = useState('');
  const [coinNetwork, setCoinNetwork] = useState('');
  const [coinWalletAddress, setCoinWalletAddress] = useState('');
  const [coinRate, setCoinRate] = useState<number>(settings.usdtRate);
  const [coinLogoUrl, setCoinLogoUrl] = useState('');
  const [isCreatingCoin, setIsCreatingCoin] = useState(false);
  const coinLogoInputRef = React.useRef<HTMLInputElement>(null);

  // Announcement form states
  const [bulletinTitle, setBulletinTitle] = useState('');
  const [bulletinContent, setBulletinContent] = useState('');
  const [bulletinScope, setBulletinScope] = useState<Announcement['scope']>('all');
  const [isCreatingBulletin, setIsCreatingBulletin] = useState(false);

  // Calculate quick metrics for Analytics view
  const totalBuyVolumeUsdt = orders
    .filter((o) => o.type === 'buy' && o.status === 'completed')
    .reduce((sum, o) => sum + o.cryptoAmount, 0);

  const totalSellVolumeNgn = orders
    .filter((o) => o.type === 'sell' && o.status === 'completed')
    .reduce((sum, o) => sum + o.ngnAmount, 0);

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const pendingKycCount = kycUsers.filter((u) => u.kycStatus === 'pending').length;

  const totalUsersCount = kycUsers.length;

  // Process order approval
  const handleOrderApproval = async (id: string) => {
    if (!blockchainTxId.trim()) {
      addToast('Please input the official Blockchain Tx ID or NGN reference code.', 'error');
      return;
    }
    setIsProcessingOrder(true);
    try {
      await processOrder(id, 'completed', blockchainTxId.trim());
      addToast('Order completed and digital receipt generated.', 'success');
      setSelectedOrder(null);
      setBlockchainTxId('');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to approve order: ' + err.message, 'error');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  // Process order rejection
  const handleOrderRejection = async (id: string) => {
    if (!orderRejectionReason.trim()) {
      addToast('Please provide a specific reason for rejection.', 'error');
      return;
    }
    setIsProcessingOrder(true);
    try {
      await processOrder(id, 'rejected', undefined, orderRejectionReason.trim());
      addToast('Order has been declined and feedback sent to user dashboard.', 'info');
      setSelectedOrder(null);
      setOrderRejectionReason('');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to reject order: ' + err.message, 'error');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  // Process KYC approval
  const handleKycApproval = async (uid: string) => {
    setIsProcessingKyc(true);
    try {
      await handleKYCReview(uid, true);
      addToast('KYC approved! Operation unlocked for user.', 'success');
      setSelectedKycUser(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to approve KYC: ' + err.message, 'error');
    } finally {
      setIsProcessingKyc(false);
    }
  };

  // Process KYC rejection
  const handleKycRejection = async (uid: string) => {
    if (!kycRejectionReason.trim()) {
      addToast('Please specify the declination reasons for retry feedback.', 'error');
      return;
    }
    setIsProcessingKyc(true);
    try {
      await handleKYCReview(uid, false, kycRejectionReason.trim());
      addToast('KYC rejected. Guidelines sent to user dashboard.', 'info');
      setSelectedKycUser(null);
      setKycRejectionReason('');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to reject KYC: ' + err.message, 'error');
    } finally {
      setIsProcessingKyc(false);
    }
  };

  // Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName || usdtRate <= 0) {
      addToast('Please complete all configurations.', 'error');
      return;
    }

    setIsSavingSettings(true);
    try {
      const updated: AdminSettings = {
        ngnBankName: bankName,
        ngnAccountNumber: accountNumber,
        ngnAccountName: accountName,
        usdtRate: Number(usdtRate),
        wallets: {
          BSC: bscWallet,
          Tron: tronWallet,
          Polygon: polygonWallet
        }
      };
      await updateAdminSettings(updated);
      addToast('System configurations updated successfully.', 'success');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Create Bulletin
  const handleCreateBulletin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulletinTitle.trim() || !bulletinContent.trim()) {
      addToast('Please provide a bulletin title and details.', 'error');
      return;
    }

    setIsCreatingBulletin(true);
    try {
      await createAnnouncement({
        title: bulletinTitle.trim(),
        content: bulletinContent.trim(),
        scope: bulletinScope,
        isActive: true
      });
      addToast('New announcement published successfully!', 'success');
      setBulletinTitle('');
      setBulletinContent('');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to create announcement: ' + err.message, 'error');
    } finally {
      setIsCreatingBulletin(false);
    }
  };

  // Toggle/Delete announcement
  const handleDeactivateBulletin = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      addToast('Announcement archived.', 'info');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Error: ' + err.message, 'error');
    }
  };

  // Create Coin Listing
  const handleCreateCoinListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinName.trim() || !coinSymbol.trim() || !coinNetwork.trim() || !coinWalletAddress.trim() || coinRate <= 0) {
      addToast('Please fill out all coin listing details.', 'error');
      return;
    }
    
    setIsCreatingCoin(true);
    try {
      await createCoinListing({
        name: coinName.trim(),
        symbol: coinSymbol.trim().toUpperCase(),
        network: coinNetwork.trim(),
        walletAddress: coinWalletAddress.trim(),
        rate: Number(coinRate),
        logoUrl: coinLogoUrl || 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=040'
      });
      addToast(`Coin listing "${coinName}" added successfully!`, 'success');
      // Reset form
      setCoinName('');
      setCoinSymbol('');
      setCoinNetwork('');
      setCoinWalletAddress('');
      setCoinRate(settings.usdtRate);
      setCoinLogoUrl('');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to list coin: ' + err.message, 'error');
    } finally {
      setIsCreatingCoin(false);
    }
  };

  // Delete Coin Listing
  const handleDeleteCoin = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to hide ${name} from coin listings? This keeps it in the database for historical transactions but hides it from users.`)) {
      return;
    }
    try {
      await deleteCoinListing(id);
      addToast(`"${name}" has been hidden successfully.`, 'info');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to hide coin listing: ' + err.message, 'error');
    }
  };

  // Toggle Coin Publish/Active status
  const handleToggleCoinPublish = async (id: string, currentPublished: boolean, name: string) => {
    const nextPublished = !currentPublished;
    try {
      await toggleCoinPublish(id, nextPublished);
      addToast(`"${name}" is now ${nextPublished ? 'published & active' : 'hidden & unpublished'}.`, 'success');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to change coin listing status: ' + err.message, 'error');
    }
  };

  // Helper to process 512x512 logo upload
  const handleCoinLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        addToast('Please upload an image file (PNG, JPG, or WEBP)', 'error');
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        addToast('Logo image size should be less than 1MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        
        // Let's create an Image element to check dimensions
        const img = new Image();
        img.src = base64;
        img.onload = () => {
          if (img.width !== 512 || img.height !== 512) {
            addToast(`Ideal logo size is 512x512px (Uploaded logo is ${img.width}x${img.height}px). Custom logo auto-scaled!`, 'info');
          } else {
            addToast('Pristine 512x512px logo verified and saved!', 'success');
          }
          setCoinLogoUrl(base64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 font-sans text-[#1A1A1A]">
      
      {/* Admin header with metrics */}
      <div className="bg-[#1A1A1A] text-white rounded-3xl p-6 border border-[#E0E7E0]/10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div className="space-y-1">
          <span className="text-[10px] bg-[#E6F4EA]/10 border border-[#E6F4EA]/20 text-[#00FF85] font-mono px-2.5 py-1 rounded-full uppercase tracking-widest font-bold">
            9IJA ESCROW ADMIN CONSOLE
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-1.5">
            Owner CMS Terminal
          </h2>
          <p className="text-xs text-gray-400">
            Secure admin portal for role {userProfile.email}
          </p>
        </div>

        <div className="flex gap-4 border-t border-[#E0E7E0]/10 lg:border-t-0 pt-4 lg:pt-0 w-full lg:w-auto overflow-x-auto">
          <div className="bg-black/20 px-4 py-2.5 rounded-2xl border border-[#E0E7E0]/10 text-center min-w-[120px]">
            <span className="text-[9px] text-gray-400 font-mono block">PENDING ORDERS</span>
            <span className="text-lg font-bold text-amber-400">{pendingOrdersCount}</span>
          </div>
          <div className="bg-black/20 px-4 py-2.5 rounded-2xl border border-[#E0E7E0]/10 text-center min-w-[120px]">
            <span className="text-[9px] text-gray-400 font-mono block">KYC REQUESTS</span>
            <span className="text-lg font-bold text-amber-400">{pendingKycCount}</span>
          </div>
          <div className="bg-black/20 px-4 py-2.5 rounded-2xl border border-[#E0E7E0]/10 text-center min-w-[120px]">
            <span className="text-[9px] text-gray-400 font-mono block">USDT RATE</span>
            <span className="text-lg font-bold text-[#00FF85]">₦{settings.usdtRate}</span>
          </div>
        </div>
      </div>

      {/* Grid: Nav Tabs and Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column navigation */}
        <div className="lg:col-span-3 space-y-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#008751] text-white border-[#008751] shadow-sm'
                : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Control Analytics
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-between border transition cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#008751] text-white border-[#008751] shadow-sm'
                : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'
            }`}
          >
            <span className="flex items-center gap-3">
              <Layers className="w-4 h-4" />
              Order Queue
            </span>
            {pendingOrdersCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('kyc')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-between border transition cursor-pointer ${
              activeTab === 'kyc'
                ? 'bg-[#008751] text-white border-[#008751] shadow-sm'
                : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'
            }`}
          >
            <span className="flex items-center gap-3">
              <FileCheck className="w-4 h-4" />
              KYC Audits
            </span>
            {pendingKycCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                {pendingKycCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-[#008751] text-white border-[#008751] shadow-sm'
                : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'
            }`}
          >
            <Users className="w-4 h-4" />
            Traders Directory ({kycUsers?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#008751] text-white border-[#008751] shadow-sm'
                : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configurations
          </button>

          <button
            onClick={() => setActiveTab('bulletins')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${
              activeTab === 'bulletins'
                ? 'bg-[#008751] text-white border-[#008751] shadow-sm'
                : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'
            }`}
          >
            <Bell className="w-4 h-4" />
            Announcements CMS
          </button>

          <button
            onClick={() => setActiveTab('coins')}
            className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${
              activeTab === 'coins'
                ? 'bg-[#008751] text-white border-[#008751] shadow-sm'
                : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'
            }`}
          >
            <Coins className="w-4 h-4" />
            Coin Listings ({coins?.length || 0})
          </button>
        </div>

        {/* Right column active content panel */}
        <div className="lg:col-span-9 bg-white rounded-3xl border border-[#E0E7E0] shadow-sm p-8">
          
          {/* TAB 1: ANALYTICS PANEL */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Financial Health & Audit Ledger</h3>
                <p className="text-xs text-slate-500">Real-time overview of escrow volumes and registration audits.</p>
              </div>

              {/* Bento grid summary stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">COMPLETED BUY VOLUME</span>
                  <div className="text-xl font-bold text-emerald-800">{totalBuyVolumeUsdt.toLocaleString()} USDT</div>
                  <span className="text-[10px] text-slate-500 leading-tight block">Authorized release on-chain</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">COMPLETED SELL VOLUME</span>
                  <div className="text-xl font-bold text-emerald-800">₦{totalSellVolumeNgn.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-500 leading-tight block">Local bank payouts confirmed</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">TOTAL USERS ON BOOK</span>
                  <div className="text-xl font-bold text-slate-800">{totalUsersCount} Traders</div>
                  <span className="text-[10px] text-slate-500 leading-tight block">With ID verification details</span>
                </div>
              </div>

              {/* Status charts / listings */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden p-5 bg-slate-50/50 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">KYC Submission Database Analysis</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="flex justify-between items-center bg-white p-3 border border-slate-100 rounded-lg">
                    <span className="text-emerald-700 font-bold">Approved Users</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                      {kycUsers.filter(u => u.kycStatus === 'approved').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 border border-slate-100 rounded-lg">
                    <span className="text-amber-700 font-bold">Pending Review</span>
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">
                      {pendingKycCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 border border-slate-100 rounded-lg">
                    <span className="text-rose-700 font-bold">Rejected / Retry</span>
                    <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold">
                      {kycUsers.filter(u => u.kycStatus === 'rejected').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <span className="font-bold block text-sm">Security Policy Active</span>
                  All operations utilize secure client-side checks and restrictive firestore.rules mapping. Admins must input legal tx hash identifiers before completing user withdrawals.
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ORDER QUEUE (MANAGEMENT) */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Order Queue</h3>
                <p className="text-xs text-slate-500">Review transfer proofs, verify receipt timestamps, and authorize payouts.</p>
              </div>

              {orders.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No buy/sell orders found in the platform database.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map((ord) => {
                    const isPending = ord.status === 'pending';
                    const isCompleted = ord.status === 'completed';
                    
                    return (
                      <div key={ord.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">#{ord.id.substring(0, 6).toUpperCase()}</span>
                            <span className={`inline-flex items-center gap-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold ${
                              ord.type === 'buy' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {ord.type === 'buy' ? 'Buy USDT' : 'Sell USDT'}
                            </span>
                            <span className={`inline-flex items-center text-[9px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500`}>
                              {ord.network}
                            </span>
                          </div>
                          <div className="text-slate-500">
                            User: <span className="font-mono">{ord.userEmail}</span> • {new Date(ord.createdAt).toLocaleString()}
                          </div>
                          <div className="font-bold text-slate-700">
                            {ord.cryptoAmount} USDT at ₦{ord.rate} = <span className="text-emerald-700">₦{ord.ngnAmount.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {ord.status === 'pending' && (
                              <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded font-bold uppercase tracking-wider text-[10px]">
                                Awaiting action
                              </span>
                            )}
                            {ord.status === 'completed' && (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-bold uppercase tracking-wider text-[10px]">
                                Completed
                              </span>
                            )}
                            {ord.status === 'rejected' && (
                              <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded font-bold uppercase tracking-wider text-[10px]">
                                Rejected
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                          >
                            Review Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KYC AUDITS */}
          {activeTab === 'kyc' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Identity Auditing Terminal</h3>
                <p className="text-xs text-slate-500">Manually inspect national identity credentials and approve users for trading operations.</p>
              </div>

              {kycUsers.filter(u => u.kycStatus === 'pending').length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-400">Zero pending KYC requests in audit queue.</p>
                  <p className="text-xs text-slate-300 mt-1">Users are notified immediately when they submit a doc.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {kycUsers
                    .filter((u) => u.kycStatus === 'pending')
                    .map((usr) => (
                      <div key={usr.uid} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 text-sm">{usr.kycData?.fullName}</h4>
                          <p className="text-slate-500 font-mono text-[11px]">{usr.email}</p>
                          <div className="text-slate-600 flex items-center gap-2">
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-bold uppercase tracking-wide text-[9px]">
                              {usr.kycData?.idType === 'nin_paper' && 'NIN (Paper Slip)'}
                              {usr.kycData?.idType === 'nin_plastic' && 'NIN (Plastic Card)'}
                              {usr.kycData?.idType === 'voters_card' && "Voter's Card"}
                              {usr.kycData?.idType === 'drivers_license' && "Driver's License"}
                            </span>
                            <span className="font-mono">ID: {usr.kycData?.idNumber}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedKycUser(usr)}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg font-bold cursor-pointer transition self-start md:self-auto"
                        >
                          Audit Document
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONFIGURATIONS (PAYMENT & RATES) */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6 text-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Merchant Configuration Panel</h3>
                <p className="text-xs text-slate-500">Update NGN cash receiving bank credentials, cryptocurrency rates, and active wallet address logs.</p>
              </div>

              {/* Rate setting */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  USDT NGN Exchange Rate
                </label>
                <div className="relative rounded-md max-w-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-xs font-bold">
                    ₦
                  </div>
                  <input
                    type="number"
                    required
                    value={usdtRate}
                    onChange={(e) => setUsdtRate(Number(e.target.value))}
                    className="block w-full pl-8 pr-12 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none"
                    placeholder="Exchange Rate"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                    / 1 USDT
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">This is the global exchange rate used on user-facing forms instantly.</p>
              </div>

              {/* Bank accounts */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">Owner receiving NGN bank credentials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Zenith Bank"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Account Number</label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 1012345678"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Account Name</label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="e.g. 9ija Escrow Ltd."
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Wallet logs */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">Crypto Wallet Addresses (USDT)</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-mono">BSC Wallet Address (BEP20)</label>
                    <input
                      type="text"
                      required
                      value={bscWallet}
                      onChange={(e) => setBscWallet(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-mono">Tron Wallet Address (TRC20)</label>
                    <input
                      type="text"
                      required
                      value={tronWallet}
                      onChange={(e) => setTronWallet(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-mono">Polygon Wallet Address</label>
                    <input
                      type="text"
                      required
                      value={polygonWallet}
                      onChange={(e) => setPolygonWallet(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
                >
                  {isSavingSettings ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Configurations'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: ANNOUNCEMENTS CMS */}
          {activeTab === 'bulletins' && (
            <div className="space-y-8 text-slate-800">
              
              {/* Bulletin creator form */}
              <form onSubmit={handleCreateBulletin} className="space-y-4 border-b border-slate-100 pb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Create Announcement</h3>
                  <p className="text-xs text-slate-500">Draft urgent public or private system bulletins.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={bulletinTitle}
                      onChange={(e) => setBulletinTitle(e.target.value)}
                      placeholder="e.g. USDT Rate sheet correction"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Target Scope</label>
                    <select
                      value={bulletinScope}
                      onChange={(e) => setBulletinScope(e.target.value as Announcement['scope'])}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="all">Public & Private Dashboard</option>
                      <option value="public">Landing Page (Public Only)</option>
                      <option value="private">User Dashboard (Private Only)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Content Details</label>
                  <textarea
                    required
                    value={bulletinContent}
                    onChange={(e) => setBulletinContent(e.target.value)}
                    rows={3}
                    placeholder="Provide full description. Please review before publishing."
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isCreatingBulletin}
                    className="bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {isCreatingBulletin ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" /> Publishing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Publish Announcement
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Announcements list */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">Current Announcements Logs</h4>
                
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-400">No announcements published.</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {announcements.map((ann) => (
                      <div key={ann.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-800 text-xs">{ann.title}</h5>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                              ann.scope === 'public' 
                                ? 'bg-blue-50 text-blue-700' 
                                : ann.scope === 'private' 
                                  ? 'bg-amber-50 text-amber-700' 
                                  : 'bg-purple-50 text-purple-700'
                            }`}>
                              Scope: {ann.scope}
                            </span>
                            {!ann.isActive && (
                              <span className="bg-slate-200 text-slate-600 text-[8px] px-1.5 rounded font-mono font-bold">INACTIVE</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{ann.content}</p>
                          <span className="text-[9px] text-slate-400 font-mono block">Published: {new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>

                        {ann.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeactivateBulletin(ann.id)}
                            className="text-rose-600 hover:text-rose-800 text-[10px] font-bold border border-rose-200 hover:border-rose-300 px-2.5 py-1 rounded cursor-pointer transition bg-white"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 7: TRADERS DIRECTORY */}
          {activeTab === 'accounts' && (
            <div className="space-y-6 text-slate-800 animate-fade-in">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Traders Directory</h3>
                <p className="text-xs text-slate-500 font-medium">Real-time listing of all accounts registered via email/password or Single Sign-On (Google).</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-xs text-slate-600 font-medium">
                  Total Accounts registered: <strong className="text-slate-900">{kycUsers.length}</strong>
                </div>
                <div className="flex gap-2">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                    Approved: {kycUsers.filter(u => u.kycStatus === 'approved').length}
                  </span>
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-100">
                    Pending: {kycUsers.filter(u => u.kycStatus === 'pending').length}
                  </span>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
                    Unverified: {kycUsers.filter(u => u.kycStatus === 'none').length}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-bold">Email / UID</th>
                        <th className="px-6 py-4 font-bold">Role</th>
                        <th className="px-6 py-4 font-bold">KYC Status</th>
                        <th className="px-6 py-4 font-bold">Verification Details</th>
                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {kycUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            No registered accounts found in database.
                          </td>
                        </tr>
                      ) : (
                        kycUsers.map((usr) => {
                          const formattedDate = usr.createdAt 
                            ? new Date(usr.createdAt).toLocaleDateString() 
                            : 'N/A';
                          return (
                            <tr key={usr.uid} className="hover:bg-slate-50/50 transition">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{usr.email}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 select-all">ID: {usr.uid}</div>
                                <div className="text-[10px] text-gray-400 mt-1">Joined: {formattedDate}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                  usr.role === 'admin' 
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}>
                                  {usr.role}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  usr.kycStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' : ''
                                } ${
                                  usr.kycStatus === 'pending' ? 'bg-amber-100 text-amber-805' : ''
                                } ${
                                  usr.kycStatus === 'rejected' ? 'bg-rose-100 text-rose-800' : ''
                                } ${
                                  usr.kycStatus === 'none' ? 'bg-slate-100 text-slate-600' : ''
                                }`}>
                                  {usr.kycStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 space-y-1">
                                {usr.kycData ? (
                                  <>
                                    <div className="font-bold text-slate-800">{usr.kycData.fullName}</div>
                                    <div className="text-[10px] text-slate-500 font-mono uppercase">
                                      {usr.kycData.idType} ({usr.kycData.idNumber})
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic">No KYC document submitted</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex flex-col sm:flex-row gap-1.5 justify-end">
                                  {usr.role === 'user' ? (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await updateUserAdminAction(usr.uid, { role: 'admin' });
                                          addToast(`Successfully promoted ${usr.email} to Admin!`, 'success');
                                          onRefresh();
                                        } catch (err: any) {
                                          addToast('Failed to change role: ' + err.message, 'error');
                                        }
                                      }}
                                      className="px-2 py-1 border border-purple-200 hover:border-purple-600 hover:bg-purple-600 hover:text-white rounded text-[10px] font-bold cursor-pointer transition"
                                    >
                                      Make Admin
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={usr.uid === userProfile.uid}
                                      onClick={async () => {
                                        try {
                                          await updateUserAdminAction(usr.uid, { role: 'user' });
                                          addToast(`Successfully demoted ${usr.email} to User.`, 'info');
                                          onRefresh();
                                        } catch (err: any) {
                                          addToast('Failed to change role: ' + err.message, 'error');
                                        }
                                      }}
                                      className={`px-2 py-1 border border-slate-200 hover:border-[#008751] hover:bg-[#008751] hover:text-white rounded text-[10px] font-bold cursor-pointer transition ${
                                        usr.uid === userProfile.uid ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title={usr.uid === userProfile.uid ? "You cannot demote yourself" : ""}
                                    >
                                      Make User
                                    </button>
                                  )}

                                  {usr.kycStatus !== 'none' && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm(`Reset KYC status for ${usr.email} back to unverified?`)) {
                                          try {
                                            await updateUserAdminAction(usr.uid, { kycStatus: 'none', kycData: undefined });
                                            addToast(`KYC status reset for ${usr.email}`, 'info');
                                            onRefresh();
                                          } catch (err: any) {
                                            addToast('Failed to reset KYC: ' + err.message, 'error');
                                          }
                                        }
                                      }}
                                      className="px-2 py-1 border border-rose-200 hover:border-rose-600 hover:bg-rose-600 hover:text-white rounded text-[10px] font-bold cursor-pointer transition"
                                    >
                                      Reset KYC
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: COIN LISTINGS CMS */}
          {activeTab === 'coins' && (
            <div className="space-y-8 text-slate-800">
              
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Cryptocurrency Listings CMS</h3>
                <p className="text-xs text-slate-500">Manage active coin listings, customized exchange rates, and receiver wallet addresses.</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* Form to add listing */}
                <form onSubmit={handleCreateCoinListing} className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Add Coin Listing</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-mono uppercase">Coin Name</label>
                      <input
                        type="text"
                        required
                        value={coinName}
                        onChange={(e) => setCoinName(e.target.value)}
                        placeholder="e.g. Tether USDT"
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-mono uppercase">Symbol (Uppercase)</label>
                      <input
                        type="text"
                        required
                        value={coinSymbol}
                        onChange={(e) => setCoinSymbol(e.target.value)}
                        placeholder="e.g. USDT"
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-mono uppercase">Network Identifier</label>
                      <input
                        type="text"
                        required
                        value={coinNetwork}
                        onChange={(e) => setCoinNetwork(e.target.value)}
                        placeholder="e.g. BSC (BEP20)"
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 font-mono uppercase">Sell Exchange Rate (NGN)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={coinRate}
                        onChange={(e) => setCoinRate(Number(e.target.value))}
                        placeholder="e.g. 1540"
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 font-mono uppercase">Receiving Wallet Address (For Customers to pay into)</label>
                    <input
                      type="text"
                      required
                      value={coinWalletAddress}
                      onChange={(e) => setCoinWalletAddress(e.target.value)}
                      placeholder="e.g. 0x71C7656EC7ab88b098defB751B7401B5..."
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono"
                    />
                  </div>

                  {/* Logo upload (512x512) */}
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 font-mono uppercase">Coin Logo (Ideal: 512x512 px)</label>
                    <div className="flex items-center gap-4">
                      {coinLogoUrl ? (
                        <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden group">
                          <img src={coinLogoUrl} alt="Logo preview" className="w-12 h-12 object-contain" />
                          <button
                            type="button"
                            onClick={() => setCoinLogoUrl('')}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition rounded-xl text-[10px] font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => coinLogoInputRef.current?.click()}
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500 transition cursor-pointer"
                        >
                          <Camera className="w-5 h-5" />
                          <span className="text-[8px] font-bold mt-1">Upload</span>
                        </button>
                      )}
                      
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => coinLogoInputRef.current?.click()}
                          className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition"
                        >
                          Select Image File
                        </button>
                        <p className="text-[10px] text-slate-400">Supports PNG, JPG, or WEBP. Image will be converted to a local 512x512 optimized asset.</p>
                      </div>

                      <input
                        type="file"
                        ref={coinLogoInputRef}
                        onChange={handleCoinLogoChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isCreatingCoin}
                      className="w-full bg-[#008751] hover:bg-[#007043] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm mt-2"
                    >
                      {isCreatingCoin ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" /> Adding to Ledger...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" /> Add Coin Listing
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* List of currently active coins */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Active Coins Directory</h4>
                  
                  {coins.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <p className="text-xs text-slate-400">No custom coins listed yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                      {coins.map((coin) => (
                        <div key={coin.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm hover:border-slate-300 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5 shrink-0">
                              {coin.logoUrl ? (
                                <img src={coin.logoUrl} alt={coin.name} className="w-9 h-9 object-contain" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#008751] flex items-center justify-center font-bold text-xs border border-emerald-100 shrink-0">
                                  {coin.symbol.slice(0, 3).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-extrabold text-slate-800 text-xs leading-none">{coin.name}</h5>
                                <span className="bg-emerald-50 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold leading-none uppercase">{coin.symbol}</span>
                                {coin.published !== false ? (
                                  <span className="bg-emerald-50 text-emerald-700 text-[8px] px-2 py-0.5 rounded-full font-extrabold border border-emerald-200/50">● Published</span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 text-[8px] px-2 py-0.5 rounded-full font-extrabold border border-slate-200">○ Hidden</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono tracking-wider break-all">Wallet: {coin.walletAddress}</p>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                                <span>Network: <strong className="text-slate-600">{coin.network}</strong></span>
                                <span>•</span>
                                <span>Rate: <strong className="text-[#008751]">₦{coin.rate}/$</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCoinPublish(coin.id!, coin.published !== false, coin.name)}
                              className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
                                coin.published !== false
                                  ? 'text-emerald-600 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-500'
                                  : 'text-slate-400 hover:bg-slate-50 border-slate-200 hover:border-slate-400'
                              }`}
                              title={coin.published !== false ? "Hide from users" : "Show to users"}
                            >
                              {coin.published !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* DETAIL ORDER MODAL FOR ADMIN ACTION */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden text-slate-800"
            >
              <div className="bg-slate-950 text-white p-5 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Order Audit Details</span>
                  <h3 className="text-base font-extrabold font-mono mt-0.5">#{selectedOrder.id.toUpperCase()}</h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono block">USER ACCOUNT</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedOrder.userEmail}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono block">Escrow Type</span>
                    <span className={`font-bold uppercase ${selectedOrder.type === 'buy' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {selectedOrder.type === 'buy' ? 'User Buying crypto' : 'User Selling crypto'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono block">Crypto Amount</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedOrder.cryptoAmount} USDT ({selectedOrder.network})</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono block">Cash Amount (NGN)</span>
                    <span className="font-bold text-slate-800">₦{selectedOrder.ngnAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Bank / account instructions */}
                {selectedOrder.userBankDetails && (
                  <div className="space-y-1.5 text-xs bg-rose-50/50 border border-rose-100 rounded-xl p-4">
                    <span className="text-[10px] text-rose-800 font-bold block uppercase tracking-wider">User NGN Payout Details (Transfer to user)</span>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono font-bold text-slate-800">
                      <div>Bank: {selectedOrder.userBankDetails.bankName}</div>
                      <div>No: {selectedOrder.userBankDetails.accountNumber}</div>
                      <div>Name: {selectedOrder.userBankDetails.accountName}</div>
                    </div>
                  </div>
                )}

                {/* Screenshot view */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Uploaded Receipt Verification Screenshot</span>
                  <div className="border border-slate-100 rounded-xl p-2 bg-slate-50 flex justify-center">
                    <img 
                      src={selectedOrder.paymentScreenshot} 
                      alt="User payment screenshot proof" 
                      className="max-h-52 w-auto object-contain rounded-lg"
                    />
                  </div>
                </div>

                {/* Action forms if pending */}
                {selectedOrder.status === 'pending' ? (
                  <div className="border-t border-slate-100 pt-5 space-y-5">
                    {/* Approval Box */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        Authorize & Release Escrow Assets
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {selectedOrder.type === 'buy' 
                          ? 'Please transfer the USDT crypto assets on-chain, then paste the official Blockchain Transaction Hash ID (TxID) below.' 
                          : 'Please transfer NGN funds to the user’s bank details listed above, then paste the bank transaction confirmation code below.'}
                      </p>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={blockchainTxId}
                          onChange={(e) => setBlockchainTxId(e.target.value)}
                          placeholder="blockchain tx_hash / reference code"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                        />
                        <button
                          onClick={() => handleOrderApproval(selectedOrder.id)}
                          disabled={isProcessingOrder}
                          className="bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition shrink-0"
                        >
                          Approve & Release
                        </button>
                      </div>
                    </div>

                    {/* Rejection Box */}
                    <div className="space-y-2.5 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        Decline escrow contract
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        If the transfer proof is fake or details do not match, input reasons to notify the user.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={orderRejectionReason}
                          onChange={(e) => setOrderRejectionReason(e.target.value)}
                          placeholder="e.g. Beneficiary account name mismatch / fake receipt"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
                        />
                        <button
                          onClick={() => handleOrderRejection(selectedOrder.id)}
                          disabled={isProcessingOrder}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition shrink-0"
                        >
                          Decline Order
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">ORDER STATUS:</span>
                      <span className={`font-bold ${selectedOrder.status === 'completed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {selectedOrder.status.toUpperCase()}
                      </span>
                    </div>
                    {selectedOrder.blockchainTxId && (
                      <div className="space-y-1">
                        <span className="text-slate-400 font-mono block">BLOCKCHAIN ID / REF CODE:</span>
                        <div className="bg-slate-50 p-2 rounded font-mono text-[10px] break-all font-bold">
                          {selectedOrder.blockchainTxId}
                        </div>
                      </div>
                    )}
                    {selectedOrder.rejectionReason && (
                      <div className="space-y-1">
                        <span className="text-rose-700 font-mono block">DECLINATION REASON:</span>
                        <div className="bg-rose-50 text-rose-950 p-2 rounded text-[10px]">
                          {selectedOrder.rejectionReason}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL KYC USER MODAL FOR ADMIN ACTION */}
      <AnimatePresence>
        {selectedKycUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden text-slate-800"
            >
              <div className="bg-slate-950 text-white p-5 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">KYC Document Audit</span>
                  <h3 className="text-base font-extrabold mt-0.5">{selectedKycUser.kycData?.fullName}</h3>
                </div>
                <button
                  onClick={() => setSelectedKycUser(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">DOCUMENT TYPE</span>
                    <span className="font-bold text-slate-800">
                      {selectedKycUser.kycData?.idType === 'nin_paper' && 'NIN (Paper Slip)'}
                      {selectedKycUser.kycData?.idType === 'nin_plastic' && 'NIN (Plastic Card)'}
                      {selectedKycUser.kycData?.idType === 'voters_card' && "Voter's Card"}
                      {selectedKycUser.kycData?.idType === 'drivers_license' && "Driver's License"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">DOCUMENT ID NUMBER</span>
                    <span className="font-bold text-slate-800">{selectedKycUser.kycData?.idNumber}</span>
                  </div>
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">USER EMAIL</span>
                    <span className="font-bold text-slate-800">{selectedKycUser.email}</span>
                  </div>
                </div>

                {/* Document View */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Identity card / slip photo proof</span>
                  <div className="border border-slate-100 rounded-xl p-2 bg-slate-50 flex justify-center">
                    <img 
                      src={selectedKycUser.kycData?.screenshotUrl} 
                      alt="Uploaded card proof" 
                      className="max-h-52 w-auto object-contain rounded-lg"
                    />
                  </div>
                </div>

                {/* Audit decisions */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleKycApproval(selectedKycUser.uid)}
                      disabled={isProcessingKyc}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold py-3 rounded-xl text-xs transition cursor-pointer text-center"
                    >
                      Approve & Verify User
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h5 className="text-xs font-bold text-rose-900">Decline Verification Request</h5>
                    <p className="text-[11px] text-slate-500">Provide feedback stating why the files were declined to let them correct and retry.</p>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={kycRejectionReason}
                        onChange={(e) => setKycRejectionReason(e.target.value)}
                        placeholder="e.g. Document image blurry / ID number mismatch / invalid name"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs"
                      />
                      <button
                        onClick={() => handleKycRejection(selectedKycUser.uid)}
                        disabled={isProcessingKyc}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition shrink-0"
                      >
                        Decline KYC
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

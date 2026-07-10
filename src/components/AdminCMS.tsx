import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, TrendingUp, Users, Layers, Settings, Bell, FileCheck, X, CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, SquareCheck as CheckSquare, ExternalLink, Wallet, Circle as HelpCircle, Clock, Lock, Plus, Coins, Trash, Camera, Eye, EyeOff, MessageSquare, Ban, UserX, UserCheck, RotateCcw, ChevronRight, CreditCard as Edit2, Percent, Link2, Search } from 'lucide-react';
import { UserProfile, Order, AdminSettings, Announcement, KYCData, CoinListing, Dispute } from '../types';
import { formatNGT, formatNGTDate } from '../lib/dateUtils';
import DisputeChat from './DisputeChat';
import { 
  processOrder, 
  handleKYCReview, 
  updateAdminSettings, 
  createAnnouncement, 
  deleteAnnouncement,
  updateAnnouncement,
  hardDeleteAnnouncement,
  createCoinListing,
  deleteCoinListing,
  toggleCoinPublish,
  updateCoinFees,
  updateCoinDetails,
  updateUserAdminAction,
  suspendUser,
  terminateUser,
  reinstateUser,
  reactivatePendingUser,
  resolveDispute
} from '../lib/dbHelpers';

interface AdminCMSProps {
  userProfile: UserProfile;
  orders: Order[];
  kycUsers: UserProfile[];
  settings: AdminSettings;
  announcements: Announcement[];
  coins: CoinListing[];
  disputes: Dispute[];
  hasMoreDisputes?: boolean;
  onLoadMoreDisputes?: () => void;
  liveNgnRate?: number | null;
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
  disputes,
  hasMoreDisputes = false,
  onLoadMoreDisputes,
  liveNgnRate,
  addToast,
  onRefresh
}: AdminCMSProps) {
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'kyc' | 'settings' | 'bulletins' | 'coins' | 'accounts' | 'disputes' | 'compliance'>('analytics');
  const [complianceViewUser, setComplianceViewUser] = useState<UserProfile | null>(null);
  const [reactivationSearchEmail, setReactivationSearchEmail] = useState('');
  const [isReactivating, setIsReactivating] = useState(false);

  // Pagination for order queue
  const [ordersQueueLimit, setOrdersQueueLimit] = useState(5);
  
  // Expanded Order for action
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [blockchainTxId, setBlockchainTxId] = useState('');
  const [orderRejectionReason, setOrderRejectionReason] = useState('');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  // Expanded KYC user for action
  const [selectedKycUser, setSelectedKycUser] = useState<UserProfile | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState('');
  const [isProcessingKyc, setIsProcessingKyc] = useState(false);

  // Copy to clipboard helper — shows toast on success or failure
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${label} copied!`, 'success');
    } catch {
      addToast('Copy failed — please select and copy manually.', 'error');
    }
  };

  // Settings form states
  const [bankName, setBankName] = useState(settings.ngnBankName);
  const [accountNumber, setAccountNumber] = useState(settings.ngnAccountNumber);
  const [accountName, setAccountName] = useState(settings.ngnAccountName);
  const [usdtSellMarkup, setUsdtSellMarkup] = useState<number>(settings.usdtSellMarkup);
  const [usdtBuyMarkup, setUsdtBuyMarkup] = useState<number>(settings.usdtBuyMarkup);
  const [bscWallet, setBscWallet] = useState(settings.wallets.BSC);
  const [tronWallet, setTronWallet] = useState(settings.wallets.Tron);
  const [polygonWallet, setPolygonWallet] = useState(settings.wallets.Polygon);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Sync form fields whenever the settings prop updates (e.g. after save → Supabase realtime refresh).
  // Without this, useState initialises once and the form reverts to stale defaults on prop change.
  useEffect(() => {
    setBankName(settings.ngnBankName);
    setAccountNumber(settings.ngnAccountNumber);
    setAccountName(settings.ngnAccountName);
    setUsdtSellMarkup(settings.usdtSellMarkup);
    setUsdtBuyMarkup(settings.usdtBuyMarkup);
    setBscWallet(settings.wallets.BSC);
    setTronWallet(settings.wallets.Tron);
    setPolygonWallet(settings.wallets.Polygon);
  }, [settings]);

  // Coin Listing form states
  const [coinName, setCoinName] = useState('');
  const [coinSymbol, setCoinSymbol] = useState('');
  const [coinNetwork, setCoinNetwork] = useState('');
  const [coinWalletAddress, setCoinWalletAddress] = useState('');
  const [coinRate, setCoinRate] = useState<number>(settings.usdtSellMarkup);
  const [coinLogoUrl, setCoinLogoUrl] = useState('');
  const [coinFeePercentage, setCoinFeePercentage] = useState<number>(0);
  const [coinMinTradeAmount, setCoinMinTradeAmount] = useState<number>(1);
  const [coinPricePegged, setCoinPricePegged] = useState<boolean>(false);
  const [isCreatingCoin, setIsCreatingCoin] = useState(false);
  const coinLogoInputRef = React.useRef<HTMLInputElement>(null);

  // Inline fee editor state for existing coins
  const [editingCoinId, setEditingCoinId] = useState<string | null>(null);
  const [editFeePercent, setEditFeePercent] = useState<number>(0);
  const [editMinAmount, setEditMinAmount] = useState<number>(1);
  const [editPricePegged, setEditPricePegged] = useState<boolean>(false);
  const [isSavingCoinFees, setIsSavingCoinFees] = useState(false);

  // Announcement form states
  const [bulletinTitle, setBulletinTitle] = useState('');
  const [bulletinContent, setBulletinContent] = useState('');
  const [bulletinScope, setBulletinScope] = useState<Announcement['scope']>('all');
  const [isCreatingBulletin, setIsCreatingBulletin] = useState(false);
  const [showArchivedBulletins, setShowArchivedBulletins] = useState(false);
  const [editingAnn, setEditingAnn] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editScope, setEditScope] = useState<'public' | 'private' | 'all'>('all');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Trader directory state
  const [selectedTrader, setSelectedTrader] = useState<UserProfile | null>(null);
  const [traderActionReason, setTraderActionReason] = useState('');
  const [isActioningTrader, setIsActioningTrader] = useState(false);

  // Dispute state
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeResponseText, setDisputeResponseText] = useState('');
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);

  // Image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Lookup tab state
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupSearched, setLookupSearched] = useState('');

  // Calculate quick metrics for Analytics view
  const totalBuyVolumeUsdt = orders
    .filter((o) => o.type === 'buy' && o.status === 'completed')
    .reduce((sum, o) => sum + o.cryptoAmount, 0);

  const totalSellVolumeNgn = orders
    .filter((o) => o.type === 'sell' && o.status === 'completed')
    .reduce((sum, o) => sum + o.ngnAmount, 0);

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const pendingKycCount = kycUsers.filter((u) => u.kycStatus === 'pending').length;
  const openDisputeCount = disputes.filter((d) => d.status === 'open').length;

  const totalUsersCount = kycUsers.filter(u => u.role !== 'admin').length;

  // Process order approval
  const handleOrderApproval = async (id: string) => {
    // For sell orders, the trader already provided a blockchain tx hash when initiating the order.
    // The admin only needs to enter a bank reference (optional if trader tx exists).
    const isSellWithTraderTx = selectedOrder?.type === 'sell' && !!selectedOrder?.blockchainTxId;
    if (!isSellWithTraderTx && !blockchainTxId.trim()) {
      addToast('Please input the official Blockchain Tx ID or NGN reference code.', 'error');
      return;
    }
    setIsProcessingOrder(true);
    try {
      // For sell orders with an existing trader tx hash, only update with admin ref if provided
      await processOrder(id, 'completed', blockchainTxId.trim() || undefined);
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

  // Suspend a trader
  const handleSuspendUser = async (uid: string, email: string) => {
    if (!traderActionReason.trim()) { addToast('Please enter a reason for suspension.', 'error'); return; }
    setIsActioningTrader(true);
    try {
      await suspendUser(uid, traderActionReason.trim());
      addToast(`${email} has been suspended.`, 'info');
      setSelectedTrader(null);
      setTraderActionReason('');
      onRefresh();
    } catch (err: any) {
      addToast('Failed to suspend: ' + err.message, 'error');
    } finally {
      setIsActioningTrader(false);
    }
  };

  // Terminate a trader
  const handleTerminateUser = async (uid: string, email: string) => {
    if (!traderActionReason.trim()) { addToast('Please enter a reason for termination.', 'error'); return; }
    if (!confirm(`Permanently terminate ${email}? They will be locked out.`)) return;
    setIsActioningTrader(true);
    try {
      await terminateUser(uid, traderActionReason.trim());
      addToast(`${email} has been terminated.`, 'info');
      setSelectedTrader(null);
      setTraderActionReason('');
      onRefresh();
    } catch (err: any) {
      addToast('Failed to terminate: ' + err.message, 'error');
    } finally {
      setIsActioningTrader(false);
    }
  };

  // Reinstate a trader
  const handleReinstateUser = async (uid: string, email: string) => {
    setIsActioningTrader(true);
    try {
      await reinstateUser(uid);
      addToast(`${email} has been reinstated to active status.`, 'success');
      if (selectedTrader?.uid === uid) setSelectedTrader({ ...selectedTrader, accountStatus: 'active', suspendReason: undefined, terminateReason: undefined });
      onRefresh();
    } catch (err: any) {
      addToast('Failed to reinstate: ' + err.message, 'error');
    } finally {
      setIsActioningTrader(false);
    }
  };

  // Reactivate a pending_reactivation account (deleted user who re-registered)
  const handleReactivatePendingUser = async (uid: string, email: string) => {
    setIsReactivating(true);
    try {
      await reactivatePendingUser(uid);
      addToast(`${email} has been reactivated. They can now sign in and access the platform.`, 'success');
      setReactivationSearchEmail('');
      onRefresh();
    } catch (err: any) {
      addToast('Failed to reactivate: ' + err.message, 'error');
    } finally {
      setIsReactivating(false);
    }
  };

  // Resolve a dispute
  const handleResolveDispute = async (id: string) => {
    if (!disputeResponseText.trim()) { addToast('Please enter your response before resolving.', 'error'); return; }
    setIsResolvingDispute(true);
    try {
      await resolveDispute(id, disputeResponseText.trim());
      addToast('Dispute resolved and response sent.', 'success');
      setSelectedDispute(null);
      setDisputeResponseText('');
      onRefresh();
    } catch (err: any) {
      addToast('Failed to resolve dispute: ' + err.message, 'error');
    } finally {
      setIsResolvingDispute(false);
    }
  };

  // Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName) {
      addToast('Please complete all bank credential fields.', 'error');
      return;
    }

    setIsSavingSettings(true);
    try {
      const updated: AdminSettings = {
        ngnBankName: bankName,
        ngnAccountNumber: accountNumber,
        ngnAccountName: accountName,
        usdtSellMarkup: Number(usdtSellMarkup),
        usdtBuyMarkup: Number(usdtBuyMarkup),
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

  // Archive announcement
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

  // Hard delete announcement
  const handleHardDeleteBulletin = async (id: string, title: string) => {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    try {
      await hardDeleteAnnouncement(id);
      addToast('Announcement permanently deleted.', 'info');
      onRefresh();
    } catch (err: any) {
      addToast('Error: ' + err.message, 'error');
    }
  };

  // Save edited announcement
  const handleSaveEdit = async () => {
    if (!editingAnn || !editTitle.trim() || !editContent.trim()) return;
    setIsSavingEdit(true);
    try {
      await updateAnnouncement(editingAnn, { title: editTitle.trim(), content: editContent.trim(), scope: editScope });
      addToast('Announcement updated.', 'success');
      setEditingAnn(null);
      onRefresh();
    } catch (err: any) {
      addToast('Update failed: ' + err.message, 'error');
    } finally {
      setIsSavingEdit(false);
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
        logoUrl: coinLogoUrl || 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=040',
        feePercentage: coinFeePercentage,
        minTradeAmount: coinMinTradeAmount,
        pricePegged: coinPricePegged,
      });
      addToast(`Coin listing "${coinName}" added successfully!`, 'success');
      // Reset form
      setCoinName('');
      setCoinSymbol('');
      setCoinNetwork('');
      setCoinWalletAddress('');
      setCoinRate(settings.usdtSellMarkup);
      setCoinLogoUrl('');
      setCoinFeePercentage(0);
      setCoinMinTradeAmount(1);
      setCoinPricePegged(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to list coin: ' + err.message, 'error');
    } finally {
      setIsCreatingCoin(false);
    }
  };

  // Save fee settings on existing coin
  const handleSaveCoinFees = async (coinId: string) => {
    setIsSavingCoinFees(true);
    try {
      await updateCoinFees(coinId, editFeePercent, editMinAmount, editPricePegged);
      addToast('Fee settings saved!', 'success');
      setEditingCoinId(null);
      onRefresh();
    } catch (err: any) {
      addToast('Failed to save fees: ' + err.message, 'error');
    } finally {
      setIsSavingCoinFees(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 font-sans text-[#1A1A1A]">
      
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

        <div className="grid grid-cols-3 gap-2 lg:flex lg:gap-4 border-t border-[#E0E7E0]/10 lg:border-t-0 pt-4 lg:pt-0 w-full lg:w-auto">
          <div className="bg-white/10 px-2.5 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl border border-white/10 text-center">
            <span className="text-[8px] lg:text-[9px] text-gray-400 font-mono block leading-tight">PENDING<br className="lg:hidden" />{' '}ORDERS</span>
            <span className="text-base lg:text-lg font-bold text-amber-400">{pendingOrdersCount}</span>
          </div>
          <div className="bg-white/10 px-2.5 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl border border-white/10 text-center">
            <span className="text-[8px] lg:text-[9px] text-gray-400 font-mono block leading-tight">KYC<br className="lg:hidden" />{' '}REQUESTS</span>
            <span className="text-base lg:text-lg font-bold text-amber-400">{pendingKycCount}</span>
          </div>
          <div className="bg-white/10 px-2.5 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl border border-white/10 text-center">
            <span className="text-[8px] lg:text-[9px] text-gray-400 font-mono block leading-tight">SELL<br className="lg:hidden" />{' '}RATE</span>
            <span className="text-base lg:text-lg font-bold text-[#00FF85]">
              ₦{liveNgnRate
                ? (Math.round(liveNgnRate) + settings.usdtSellMarkup).toLocaleString()
                : `+${settings.usdtSellMarkup}`}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Nav Tabs and Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* Tab navigation — horizontal scroll strip on mobile, vertical sidebar on desktop */}
        <div className="lg:col-span-3">

          {/* ── Mobile chip strip (hidden on lg+) ── */}
          <div className="flex lg:hidden overflow-x-auto gap-2 pt-2 pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>

            {/* Analytics */}
            <button onClick={() => setActiveTab('analytics')} className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === 'analytics' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              <TrendingUp className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">Analytics</span>
            </button>

            {/* Orders */}
            <button onClick={() => setActiveTab('orders')} className={`relative flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === 'orders' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              {pendingOrdersCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-extrabold bg-amber-400 text-slate-900">{pendingOrdersCount}</span>}
              <Layers className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">Orders</span>
            </button>

            {/* KYC */}
            <button onClick={() => setActiveTab('kyc')} className={`relative flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === 'kyc' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              {pendingKycCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-extrabold bg-amber-400 text-slate-900">{pendingKycCount}</span>}
              <FileCheck className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">KYC</span>
            </button>

            {/* Traders */}
            <button onClick={() => setActiveTab('accounts')} className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === 'accounts' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              <Users className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">Traders</span>
            </button>

            {/* Compliance */}
            <button onClick={() => setActiveTab('compliance')} className={`relative flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === 'compliance' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              {kycUsers.filter(u => u.accountStatus === 'deleted' || u.accountStatus === 'pending_reactivation').length > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-extrabold bg-slate-700 text-white">{kycUsers.filter(u => u.accountStatus === 'deleted' || u.accountStatus === 'pending_reactivation').length}</span>}
              <Lock className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">Compliance</span>
            </button>

            {/* Config */}
            <button onClick={() => setActiveTab('settings')} className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === 'settings' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              <Settings className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">Config</span>
            </button>

            {/* Bulletins */}
            <button onClick={() => setActiveTab('bulletins')} className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === 'bulletins' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              <Bell className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">Posts</span>
            </button>

            {/* Coins */}
            <button onClick={() => setActiveTab('coins')} className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === 'coins' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              <Coins className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">Coins</span>
            </button>

            {/* Disputes */}
            <button onClick={() => setActiveTab('disputes')} className={`relative flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === 'disputes' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              {openDisputeCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-extrabold bg-rose-500 text-white">{openDisputeCount}</span>}
              <MessageSquare className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">Disputes</span>
            </button>

            {/* Lookup */}
            <button onClick={() => setActiveTab('lookup' as any)} className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold transition cursor-pointer min-w-[72px] ${activeTab === ('lookup' as any) ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white text-gray-600 border-[#E0E7E0]'}`}>
              <HelpCircle className="w-4 h-4" />
              <span className="text-[9px] uppercase tracking-wide leading-tight text-center">Lookup</span>
            </button>
          </div>

          {/* ── Desktop vertical sidebar (hidden below lg) ── */}
          <div className="hidden lg:flex lg:flex-col lg:space-y-2">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${activeTab === 'analytics' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <TrendingUp className="w-4 h-4" />
              Control Analytics
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-between border transition cursor-pointer ${activeTab === 'orders' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <span className="flex items-center gap-3"><Layers className="w-4 h-4" /> Order Queue</span>
              {pendingOrdersCount > 0 && <span className="bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full text-[10px]">{pendingOrdersCount}</span>}
            </button>

            <button
              onClick={() => setActiveTab('kyc')}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-between border transition cursor-pointer ${activeTab === 'kyc' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <span className="flex items-center gap-3"><FileCheck className="w-4 h-4" /> KYC Audits</span>
              {pendingKycCount > 0 && <span className="bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full text-[10px]">{pendingKycCount}</span>}
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${activeTab === 'accounts' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <Users className="w-4 h-4" />
              Traders Directory ({kycUsers?.filter(u => u.role !== 'admin').length || 0})
            </button>

            <button
              onClick={() => setActiveTab('compliance')}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-between border transition cursor-pointer ${activeTab === 'compliance' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <span className="flex items-center gap-3"><Lock className="w-4 h-4" /> Compliance Audit</span>
              {kycUsers.filter(u => u.accountStatus === 'deleted' || u.accountStatus === 'pending_reactivation').length > 0 && <span className="bg-slate-700 text-white font-extrabold px-2 py-0.5 rounded-full text-[10px]">{kycUsers.filter(u => u.accountStatus === 'deleted' || u.accountStatus === 'pending_reactivation').length}</span>}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${activeTab === 'settings' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <Settings className="w-4 h-4" />
              Configurations
            </button>

            <button
              onClick={() => setActiveTab('bulletins')}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${activeTab === 'bulletins' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <Bell className="w-4 h-4" />
              Announcements CMS
            </button>

            <button
              onClick={() => setActiveTab('coins')}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${activeTab === 'coins' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <Coins className="w-4 h-4" />
              Coin Listings ({coins?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('disputes')}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-between border transition cursor-pointer ${activeTab === 'disputes' ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <span className="flex items-center gap-3"><MessageSquare className="w-4 h-4" /> Disputes</span>
              {openDisputeCount > 0 && <span className="bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full text-[10px]">{openDisputeCount}</span>}
            </button>

            <button
              onClick={() => setActiveTab('lookup' as any)}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 border transition cursor-pointer ${activeTab === ('lookup' as any) ? 'bg-[#008751] text-white border-[#008751] shadow-sm' : 'bg-white hover:bg-[#F7F9F7] text-gray-700 border-[#E0E7E0] hover:border-gray-400'}`}
            >
              <HelpCircle className="w-4 h-4" />
              Order / Trader Lookup
            </button>
          </div>
        </div>

        {/* Right column active content panel */}
        <div className="lg:col-span-9 bg-white rounded-3xl border border-[#E0E7E0] shadow-sm p-5 lg:p-8 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >

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
                  {orders.slice(0, ordersQueueLimit).map((ord) => {
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
                              {ord.type === 'buy' ? ord.token === "USDT" ? `Buy USDT` : `Buy ${ord.token}/USDT` : ord.token === "USDT" ? `Sell USDT` : `Sell ${ord.token}/USDT`}
                            </span>
                            <span className={`inline-flex items-center text-[9px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500`}>
                              {ord.network}
                            </span>
                          </div>
                          <div className="text-slate-500">
                            User: <span className="font-mono">{ord.userEmail}</span> • {formatNGT(ord.createdAt)}
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
                  {orders.length > ordersQueueLimit && (
                    <div className="pt-4 border-t border-slate-100 text-center">
                      <button
                        onClick={() => setOrdersQueueLimit((prev) => prev + 5)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 px-5 py-2 rounded-xl transition cursor-pointer"
                      >
                        Load more orders ({orders.length - ordersQueueLimit} remaining)
                      </button>
                    </div>
                  )}
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

              {/* Rate setting — split SELL / BUY markups */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">NGN/USDT Rate Configuration</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Set the NGN markup added on top of the live CoinGecko market price for each trade direction.
                    The SELL rate drives the hero & dashboard display.
                  </p>
                </div>

                {/* Live preview card */}
                {liveNgnRate ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono uppercase text-[9px] tracking-wider">Live Market (CoinGecko)</span>
                      <span className="font-semibold text-slate-600">₦{Math.round(liveNgnRate).toLocaleString()} / USDT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono uppercase text-[9px] tracking-wider">Effective SELL Rate</span>
                      <span className="font-bold text-emerald-700">₦{(Math.round(liveNgnRate) + usdtSellMarkup).toLocaleString()} / USDT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono uppercase text-[9px] tracking-wider">Effective BUY Rate</span>
                      <span className="font-bold text-blue-700">₦{(Math.round(liveNgnRate) + usdtBuyMarkup).toLocaleString()} / USDT</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-700 font-mono">
                    ⏳ Fetching live market rate… preview will appear once available.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* SELL Markup */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono uppercase mb-1.5">
                      SELL Markup (NGN added to market)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-xs font-bold">+₦</div>
                      <input
                        type="number"
                        value={usdtSellMarkup}
                        onChange={(e) => setUsdtSellMarkup(Number(e.target.value))}
                        className="block w-full pl-10 pr-14 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#008751]"
                        placeholder="e.g. 100"
                        min={0}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">/ USDT</div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Hero display, dashboard card & sell orders.</p>
                  </div>

                  {/* BUY Markup */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono uppercase mb-1.5">
                      BUY Markup (NGN added to market)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-xs font-bold">+₦</div>
                      <input
                        type="number"
                        value={usdtBuyMarkup}
                        onChange={(e) => setUsdtBuyMarkup(Number(e.target.value))}
                        className="block w-full pl-10 pr-14 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#008751]"
                        placeholder="e.g. 80"
                        min={0}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">/ USDT</div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Applied only at buy order creation time.</p>
                  </div>
                </div>
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
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">Announcements Log</h4>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowArchivedBulletins(false)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold cursor-pointer transition ${!showArchivedBulletins ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      Active ({announcements.filter(a => a.isActive).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowArchivedBulletins(true)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold cursor-pointer transition ${showArchivedBulletins ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      Archived ({announcements.filter(a => !a.isActive).length})
                    </button>
                  </div>
                </div>

                {(() => {
                  const filtered = announcements.filter(a => showArchivedBulletins ? !a.isActive : a.isActive);
                  return filtered.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      {showArchivedBulletins ? 'No archived announcements.' : 'No active announcements published.'}
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {filtered.map((ann) => (
                        <div key={ann.id} className={`border rounded-xl overflow-hidden ${ann.isActive ? 'bg-slate-50 border-slate-100' : 'bg-slate-50/40 border-dashed border-slate-200 opacity-70'}`}>
                          {/* Edit inline form */}
                          {editingAnn === ann.id ? (
                            <div className="p-3 space-y-2.5 bg-white border-b border-slate-100">
                              <input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
                                placeholder="Announcement title"
                              />
                              <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] resize-none"
                                placeholder="Announcement content"
                              />
                              <div className="flex items-center gap-2">
                                <select
                                  value={editScope}
                                  onChange={e => setEditScope(e.target.value as 'public' | 'private' | 'all')}
                                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                                >
                                  <option value="all">All Users</option>
                                  <option value="public">Public Only</option>
                                  <option value="private">Traders Only</option>
                                </select>
                                <button type="button" onClick={handleSaveEdit} disabled={isSavingEdit} className="px-3 py-1.5 bg-[#008751] hover:bg-[#007043] text-white text-[10px] font-bold rounded-lg cursor-pointer transition disabled:opacity-50">
                                  {isSavingEdit ? 'Saving…' : 'Save'}
                                </button>
                                <button type="button" onClick={() => setEditingAnn(null)} className="px-3 py-1.5 border border-slate-200 text-[10px] font-bold rounded-lg cursor-pointer transition hover:bg-slate-100">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-bold text-slate-800 text-xs">{ann.title}</h5>
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                                    ann.scope === 'public' ? 'bg-blue-50 text-blue-700' : ann.scope === 'private' ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'
                                  }`}>{ann.scope}</span>
                                  {!ann.isActive && <span className="bg-slate-200 text-slate-500 text-[8px] px-1.5 rounded font-mono font-bold">ARCHIVED</span>}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">{ann.content}</p>
                                <span className="text-[9px] text-slate-400 font-mono block">Published: {formatNGTDate(ann.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => { setEditingAnn(ann.id); setEditTitle(ann.title); setEditContent(ann.content); setEditScope(ann.scope as 'public' | 'private' | 'all'); }}
                                  className="text-[10px] font-bold border border-slate-200 hover:border-[#008751] hover:text-[#008751] px-2 py-1 rounded cursor-pointer transition bg-white"
                                >
                                  Edit
                                </button>
                                {ann.isActive && (
                                  <button type="button" onClick={() => handleDeactivateBulletin(ann.id)} className="text-[10px] font-bold border border-amber-200 hover:border-amber-400 text-amber-700 hover:text-amber-900 px-2 py-1 rounded cursor-pointer transition bg-white">
                                    Archive
                                  </button>
                                )}
                                <button type="button" onClick={() => handleHardDeleteBulletin(ann.id, ann.title)} className="text-[10px] font-bold border border-rose-200 hover:border-rose-400 text-rose-600 hover:text-rose-800 px-2 py-1 rounded cursor-pointer transition bg-white">
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {/* TAB: LOOKUP */}
          {(activeTab as string) === 'lookup' && (() => {
            const q = lookupSearched.trim().toLowerCase();
            const matchedOrders = q
              ? orders.filter(o =>
                  o.id.toLowerCase().includes(q) ||
                  o.userEmail.toLowerCase().includes(q)
                )
              : [];
            const matchedTraders = q
              ? kycUsers.filter(u =>
                  u.email.toLowerCase().includes(q) ||
                  u.uid.toLowerCase().includes(q)
                )
              : [];
            const hasResults = matchedOrders.length > 0 || matchedTraders.length > 0;

            return (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Order / Trader Lookup</h3>
                  <p className="text-xs text-slate-500">Search by Order ID, trader email, or user ID to locate a transaction or account.</p>
                </div>

                {/* Search input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); setLookupSearched(lookupQuery); }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="Paste Order ID or enter trader email..."
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30 font-mono"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-[#008751] text-white px-5 py-3 rounded-xl text-sm font-bold transition cursor-pointer"
                  >
                    Search
                  </button>
                  {lookupSearched && (
                    <button
                      type="button"
                      onClick={() => { setLookupQuery(''); setLookupSearched(''); }}
                      className="px-3 py-3 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </form>

                {lookupSearched && !hasResults && (
                  <div className="text-center py-12 text-slate-400">
                    <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No results for "{lookupSearched}"</p>
                    <p className="text-xs mt-1">Try the full Order ID or an exact email address.</p>
                  </div>
                )}

                {/* Matching Traders */}
                {matchedTraders.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{matchedTraders.length} Trader{matchedTraders.length !== 1 ? 's' : ''} found</span>
                    </div>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {matchedTraders.map(t => (
                        <div key={t.uid} className="flex items-center justify-between gap-4 px-5 py-4">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-sm text-slate-900">{t.email}</div>
                            <div className="flex gap-2 flex-wrap">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                t.accountStatus === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                t.accountStatus === 'suspended' ? 'bg-amber-100 text-amber-700' :
                                t.accountStatus === 'pending_reactivation' ? 'bg-blue-100 text-blue-700' :
                                t.accountStatus === 'deleted' ? 'bg-slate-200 text-slate-600' :
                                'bg-rose-100 text-rose-700'
                              }`}>{t.accountStatus}</span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-500">KYC: {t.kycStatus}</span>
                              {t.kycData && <span className="text-[9px] font-mono text-slate-400">{t.kycData.fullName}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => { setSelectedTrader(t); setTraderActionReason(''); }}
                            className="shrink-0 bg-slate-900 hover:bg-[#008751] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                            Full Profile
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching Orders */}
                {matchedOrders.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{matchedOrders.length} Order{matchedOrders.length !== 1 ? 's' : ''} found</span>
                    </div>
                    <div className="space-y-3">
                      {matchedOrders.map(o => {
                        const trader = kycUsers.find(u => u.uid === o.userId);
                        return (
                          <div key={o.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                            <div className="bg-slate-50 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-sm text-slate-900">#{o.id.substring(0,8).toUpperCase()}</span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                    o.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>{o.status}</span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${o.type === 'buy' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{o.type}</span>
                                </div>
                                <div className="text-xs text-slate-500 font-mono">{formatNGT(o.createdAt)}</div>
                              </div>
                              <button
                                onClick={() => setSelectedOrder(o)}
                                className="shrink-0 bg-slate-900 hover:bg-[#008751] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                View Details
                              </button>
                            </div>
                            <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">Amount</span>
                                <span className="font-bold text-slate-800">{o.cryptoAmount} USDT</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">NGN Value</span>
                                <span className="font-bold text-slate-800">₦{o.ngnAmount.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">Rate</span>
                                <span className="font-bold text-slate-800">₦{o.rate}/USDT</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">Network</span>
                                <span className="font-bold text-slate-800">{o.network}</span>
                              </div>
                              {o.userBankDetails && (
                                <div className="col-span-2">
                                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Trader Bank</span>
                                  <span className="font-bold text-slate-800">{o.userBankDetails.bankName} — {o.userBankDetails.accountNumber} ({o.userBankDetails.accountName})</span>
                                </div>
                              )}
                              {o.blockchainTxId && (
                                <div className="col-span-2">
                                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Blockchain TX</span>
                                  <span className="font-mono text-slate-700 break-all">{o.blockchainTxId}</span>
                                </div>
                              )}
                              {o.rejectionReason && (
                                <div className="col-span-2">
                                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Rejection Reason</span>
                                  <span className="text-rose-700">{o.rejectionReason}</span>
                                </div>
                              )}
                              <div className="col-span-2 pt-1 border-t border-slate-100">
                                <span className="text-slate-400 block text-[10px] uppercase font-mono mb-1">Trader</span>
                                <button
                                  onClick={() => {
                                    const t = kycUsers.find(u => u.uid === o.userId);
                                    if (t) { setSelectedTrader(t); setTraderActionReason(''); }
                                    else addToast('Trader profile not found in current list.', 'info');
                                  }}
                                  className="inline-flex items-center gap-1.5 text-[#008751] hover:underline font-semibold cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  {o.userEmail}
                                  {trader?.kycData?.fullName && <span className="text-slate-400 font-normal">({trader.kycData.fullName})</span>}
                                  <ChevronRight className="w-3 h-3 opacity-50" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: DISPUTES */}
          {activeTab === 'disputes' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Trader Disputes</h3>
                <p className="text-xs text-slate-500">Review trader challenges submitted on rejected orders.</p>
              </div>

              {disputes.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No disputes submitted yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {disputes.map((d) => (
                    <div key={d.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-sm">Order #{d.orderId.substring(0, 6).toUpperCase()}</span>
                          <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            d.status === 'open' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>{d.status}</span>
                        </div>
                        <div className="text-slate-500">
                          From: <span className="font-mono">{d.userEmail}</span> • {formatNGT(d.createdAt)}
                        </div>
                        <div className="text-slate-700 max-w-md line-clamp-2">{d.message}</div>
                        {d.imageUrls && d.imageUrls.length > 0 && (
                          <div className="flex gap-2 flex-wrap pt-1">
                            {d.imageUrls.map((url, idx) => (
                              <button key={idx} type="button" onClick={() => setLightboxUrl(url)}>
                                <img src={url} alt={`proof ${idx + 1}`} className="h-14 w-18 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition cursor-pointer" />
                              </button>
                            ))}
                          </div>
                        )}
                        {d.adminResponse && (
                          <div className="text-emerald-700 text-[10px] font-mono">
                            ✓ Response: {d.adminResponse}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        <button
                          onClick={() => { setSelectedDispute(d); setDisputeResponseText(''); }}
                          className={`text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                            d.status === 'open'
                              ? 'bg-slate-900 hover:bg-[#008751]'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          {d.status === 'open' ? 'Open Chat & Resolve' : 'View Thread'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Load more disputes button */}
                  {hasMoreDisputes && onLoadMoreDisputes && (
                    <button
                      onClick={onLoadMoreDisputes}
                      className="w-full py-3 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer uppercase tracking-wide"
                    >
                      Load More Disputes
                    </button>
                  )}
                </div>
              )}
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
                  Total Traders registered: <strong className="text-slate-900">{kycUsers.filter(u => u.role !== 'admin').length}</strong>
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
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedTrader(usr); setTraderActionReason(''); }}
                                    className="px-2 py-1 border border-slate-300 hover:border-[#008751] hover:bg-[#008751] hover:text-white rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                    Profile
                                  </button>
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

          {/* TAB: COMPLIANCE AUDIT — deleted/scrubbed accounts, KYC data retained for legal review */}
          {activeTab === 'compliance' && (
            <div className="space-y-6 text-slate-800 animate-fade-in">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Compliance Audit — Deleted Accounts</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Accounts that requested deletion have had their login and personal profile data scrubbed. Their KYC identity documents are retained here for fraud/legal review, as disclosed to the user at deletion time.
                </p>
              </div>

              {/* PENDING REACTIVATION — deleted users who re-registered, awaiting admin approval */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <h4 className="text-sm font-bold text-blue-900">Pending Reactivation Requests</h4>
                  {kycUsers.filter(u => u.accountStatus === 'pending_reactivation').length > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {kycUsers.filter(u => u.accountStatus === 'pending_reactivation').length} awaiting
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-800 mb-4">
                  These users previously deleted their account and have signed up again with the same email. Their retained KYC status and order history are preserved, but they are blocked from accessing the platform until you approve reactivation. Search by email to find a specific user, then click Reactivate.
                </p>

                {/* Email search */}
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="Enter user's email to look up pending account..."
                      value={reactivationSearchEmail}
                      onChange={(e) => setReactivationSearchEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs border border-blue-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Pending accounts list — filtered by search email if provided */}
                <div className="border border-blue-100 rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-blue-50 text-left text-xs">
                      <thead className="bg-blue-50 text-blue-400 font-mono text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-bold">Email</th>
                          <th className="px-4 py-3 font-bold">KYC Status</th>
                          <th className="px-4 py-3 font-bold">Role</th>
                          <th className="px-4 py-3 font-bold">Registered</th>
                          <th className="px-4 py-3 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50 text-slate-700">
                        {(() => {
                          const pending = kycUsers
                            .filter(u => u.accountStatus === 'pending_reactivation')
                            .filter(u => !reactivationSearchEmail.trim() ||
                              u.email.toLowerCase().includes(reactivationSearchEmail.trim().toLowerCase()));
                          if (pending.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-blue-400">
                                  {reactivationSearchEmail.trim()
                                    ? 'No pending reactivation account matches that email.'
                                    : 'No pending reactivation requests right now.'}
                                </td>
                              </tr>
                            );
                          }
                          return pending.map((usr) => (
                            <tr key={usr.uid} className="hover:bg-blue-50/50">
                              <td className="px-4 py-3 font-medium text-slate-800 break-all">{usr.email}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  usr.kycStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                  usr.kycStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                                  usr.kycStatus === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{usr.kycStatus}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">{usr.role}</td>
                              <td className="px-4 py-3 text-slate-500">{formatNGT(usr.createdAt)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleReactivatePendingUser(usr.uid, usr.email)}
                                  disabled={isReactivating}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  {isReactivating ? 'Reactivating...' : 'Reactivate'}
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-xs text-slate-600 font-medium">
                  Total scrubbed accounts: <strong className="text-slate-900">{kycUsers.filter(u => u.accountStatus === 'deleted' || u.accountStatus === 'pending_reactivation').length}</strong>
                </div>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
                  With retained KYC: {kycUsers.filter(u => (u.accountStatus === 'deleted' || u.accountStatus === 'pending_reactivation') && u.kycData).length}
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-bold">Scrubbed Email / UID</th>
                        <th className="px-6 py-4 font-bold">Deleted At</th>
                        <th className="px-6 py-4 font-bold">Retained KYC Status</th>
                        <th className="px-6 py-4 font-bold">Identity On File</th>
                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {kycUsers.filter(u => u.accountStatus === 'deleted' || u.accountStatus === 'pending_reactivation').length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            No deleted accounts on record.
                          </td>
                        </tr>
                      ) : (
                        kycUsers.filter(u => u.accountStatus === 'deleted' || u.accountStatus === 'pending_reactivation').map((usr) => {
                          const isPendingReactivation = usr.accountStatus === 'pending_reactivation';
                          const deletedDate = usr.deletedAt
                            ? formatNGT(usr.deletedAt)
                            : '—';
                          return (
                            <tr key={usr.uid} className="hover:bg-slate-50/50 transition">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{usr.email}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 select-all">ID: {usr.uid}</div>
                                {isPendingReactivation && (
                                  <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">Re-registered · Pending Admin Approval</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-slate-600">{deletedDate}</td>
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
                              <td className="px-6 py-4">
                                {usr.kycData ? (
                                  <>
                                    <div className="font-bold text-slate-800">{usr.kycData.fullName}</div>
                                    <div className="text-[10px] text-slate-500 font-mono uppercase">
                                      {usr.kycData.idType} ({usr.kycData.idNumber})
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic">No KYC document was ever submitted</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {usr.kycData ? (
                                  <button
                                    type="button"
                                    onClick={() => setComplianceViewUser(usr)}
                                    className="px-2 py-1 border border-slate-300 hover:border-[#008751] hover:bg-[#008751] hover:text-white rounded text-[10px] font-bold cursor-pointer transition inline-flex items-center gap-1"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                    View KYC
                                  </button>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
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

                  {/* Fee % + Min Trade Amount */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div>
                      <label className="block text-[10px] text-amber-700 mb-1 font-mono uppercase flex items-center gap-1">
                        <Percent className="w-3 h-3" /> Platform Fee (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={coinFeePercentage}
                        onChange={(e) => setCoinFeePercentage(Number(e.target.value))}
                        placeholder="e.g. 7"
                        className="block w-full px-3 py-2 border border-amber-200 rounded-lg text-xs bg-white"
                      />
                      <p className="text-[9px] text-amber-600 mt-1">Deducted from user's crypto on BUY. 0 = no fee.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-700 mb-1 font-mono uppercase">Min Trade Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={coinMinTradeAmount}
                        onChange={(e) => setCoinMinTradeAmount(Number(e.target.value))}
                        placeholder="e.g. 5"
                        className="block w-full px-3 py-2 border border-amber-200 rounded-lg text-xs bg-white"
                      />
                      <p className="text-[9px] text-amber-600 mt-1">Minimum units a user must trade.</p>
                    </div>
                  </div>

                  {/* Price Peg toggle */}
                  <label className="flex items-start gap-3 p-3 bg-sky-50 border border-sky-200 rounded-xl cursor-pointer hover:bg-sky-100/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={coinPricePegged}
                      onChange={(e) => setCoinPricePegged(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-sky-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5" /> USDT Price Peg Synchronization
                      </span>
                      <p className="text-[10px] text-sky-600 mt-0.5 leading-relaxed">
                        When enabled, this coin's price automatically follows the live effective Buy/Sell rate (market + admin markup) instead of its own static rate. The price updates as users switch between Buy and Sell tabs.
                      </p>
                    </div>
                  </label>

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
                            <div className="space-y-1 flex-1 min-w-0">
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
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono flex-wrap">
                                <span>Network: <strong className="text-slate-600">{coin.network}</strong></span>
                                <span>•</span>
                                <span>Rate: <strong className="text-[#008751]">₦{coin.rate}/$</strong></span>
                                <span>•</span>
                                <span>Fee: <strong className="text-amber-600">{coin.feePercentage ?? 0}%</strong></span>
                                <span>•</span>
                                <span>Min: <strong className="text-slate-600">{coin.minTradeAmount ?? 1} {coin.symbol}</strong></span>
                                {coin.pricePegged && (
                                  <>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-0.5 bg-sky-50 text-sky-700 text-[8px] px-1.5 py-0.5 rounded-full font-extrabold border border-sky-200/50">
                                      <Link2 className="w-2.5 h-2.5" /> PEGGED
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Inline fee editor */}
                              {editingCoinId === coin.id && (
                                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-end gap-2">
                                  <div>
                                    <label className="block text-[9px] text-amber-700 font-mono uppercase mb-1">Fee %</label>
                                    <input
                                      type="number" min="0" max="100" step="0.01"
                                      value={editFeePercent}
                                      onChange={(e) => setEditFeePercent(Number(e.target.value))}
                                      className="w-20 px-2 py-1.5 border border-amber-200 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] text-amber-700 font-mono uppercase mb-1">Min Amount</label>
                                    <input
                                      type="number" min="0" step="any"
                                      value={editMinAmount}
                                      onChange={(e) => setEditMinAmount(Number(e.target.value))}
                                      className="w-24 px-2 py-1.5 border border-amber-200 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <label className="flex items-center gap-1.5 text-[10px] text-amber-700 font-bold cursor-pointer select-none pb-1.5">
                                    <input
                                      type="checkbox"
                                      checked={editPricePegged}
                                      onChange={(e) => setEditPricePegged(e.target.checked)}
                                      className="w-3.5 h-3.5 accent-sky-500 cursor-pointer"
                                    />
                                    Price Peg
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveCoinFees(coin.id!)}
                                    disabled={isSavingCoinFees}
                                    className="px-3 py-1.5 bg-[#008751] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#007043] transition disabled:opacity-60"
                                  >
                                    {isSavingCoinFees ? 'Saving…' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCoinId(null)}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-200 transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCoinId(coin.id!);
                                setEditFeePercent(coin.feePercentage ?? 0);
                                setEditMinAmount(coin.minTradeAmount ?? 1);
                                setEditPricePegged(coin.pricePegged ?? false);
                              }}
                              className="p-2 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 transition cursor-pointer shrink-0"
                              title="Edit fee & minimum"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
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

          </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* DETAIL ORDER MODAL FOR ADMIN ACTION */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
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

                {/* User crypto receiving address — always shown for buy orders */}
                {selectedOrder.type === 'buy' && (
                  <div className="space-y-1.5 text-xs bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wider">
                      ⬇ User Crypto Receiving Address (Send crypto HERE)
                    </span>
                    {selectedOrder.userWalletAddress ? (
                      <>
                        <div className="flex items-start gap-2 text-[11px] font-mono font-bold text-slate-800">
                          <span className="break-all flex-1">{selectedOrder.userWalletAddress}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedOrder!.userWalletAddress!, 'Wallet address')}
                            className="p-0.5 rounded text-emerald-600 hover:text-emerald-800 transition cursor-pointer shrink-0 mt-0.5"
                            title="Copy wallet address"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </button>
                        </div>
                        <div className="text-[10px] text-emerald-700">Network: {selectedOrder.network}</div>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No receiving address provided by user.</p>
                    )}
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

                      {/* For sell orders: show trader's blockchain tx hash (read-only) */}
                      {selectedOrder.type === 'sell' && selectedOrder.blockchainTxId && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">Trader's Blockchain Transaction Hash</span>
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-[10px] font-mono break-all font-bold">
                            {selectedOrder.blockchainTxId}
                          </div>
                          <p className="text-[10px] text-slate-400">This is the on-chain TxID the trader submitted. Verify it on the blockchain explorer before approving.</p>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500">
                        {selectedOrder.type === 'buy'
                          ? 'Transfer the USDT crypto assets on-chain, then paste the official Blockchain Transaction Hash ID (TxID) below.'
                          : selectedOrder.blockchainTxId
                            ? 'Transfer NGN funds to the user\'s bank account above, then enter your bank transfer reference code below (optional — trader\'s blockchain TxID is already recorded).'
                            : 'Transfer NGN funds to the user\'s bank account above, then paste the bank transfer confirmation/reference code below.'}
                      </p>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={blockchainTxId}
                          onChange={(e) => setBlockchainTxId(e.target.value)}
                          placeholder={
                            selectedOrder.type === 'sell' && selectedOrder.blockchainTxId
                              ? 'Bank transfer ref (optional)'
                              : 'blockchain tx_hash / reference code'
                          }
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

                    {/* Wallet address in completed/rejected receipt for BUY orders */}
                    {selectedOrder.type === 'buy' && selectedOrder.userWalletAddress && (
                      <div className="space-y-1">
                        <span className="text-emerald-700 font-mono block uppercase">User Crypto Receiving Address:</span>
                        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 p-2 rounded font-mono text-[10px] break-all font-bold text-slate-800">
                          <span className="flex-1">{selectedOrder.userWalletAddress}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedOrder!.userWalletAddress!, 'Wallet address')}
                            className="p-0.5 rounded text-emerald-600 hover:text-emerald-800 transition cursor-pointer shrink-0"
                            title="Copy wallet address"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </button>
                        </div>
                        <div className="text-[10px] text-emerald-600">Network: {selectedOrder.network}</div>
                      </div>
                    )}

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
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
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

                {/* Document View — ID card */}
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

                {/* Document View — Selfie holding ID */}
                {selectedKycUser.kycData?.holdingIdUrl && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Selfie — holding ID beside face</span>
                    <div className="border border-slate-100 rounded-xl p-2 bg-slate-50 flex justify-center">
                      <img 
                        src={selectedKycUser.kycData.holdingIdUrl} 
                        alt="Holding ID selfie proof" 
                        className="max-h-52 w-auto object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}

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

      {/* TRADER PROFILE MODAL */}
      <AnimatePresence>
        {selectedTrader && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start md:items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden text-slate-800 flex flex-col my-2 sm:my-4 max-h-[96vh]"
            >
              <div className="bg-slate-950 text-white p-5 flex justify-between items-center shrink-0">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">Trader Profile</span>
                  <h3 className="text-base font-extrabold mt-0.5">{selectedTrader.email}</h3>
                </div>
                <button onClick={() => setSelectedTrader(null)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
                {/* Account status badge */}
                <div className="flex gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    selectedTrader.accountStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                    selectedTrader.accountStatus === 'suspended' ? 'bg-amber-100 text-amber-800' :
                    selectedTrader.accountStatus === 'pending_reactivation' ? 'bg-blue-100 text-blue-800' :
                    selectedTrader.accountStatus === 'deleted' ? 'bg-slate-200 text-slate-700' :
                    'bg-rose-100 text-rose-800'
                  }`}>{selectedTrader.accountStatus}</span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">{selectedTrader.role}</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    selectedTrader.kycStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    selectedTrader.kycStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
                    selectedTrader.kycStatus === 'rejected' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>KYC: {selectedTrader.kycStatus}</span>
                </div>

                {/* Basic info */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase">Joined</span>
                    <span className="font-bold text-slate-800">{formatNGTDate(selectedTrader.createdAt)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase">UID</span>
                    <span className="font-bold text-slate-800 text-[9px] break-all">{selectedTrader.uid}</span>
                  </div>
                  {selectedTrader.kycData && (
                    <>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[9px] uppercase">Full Name</span>
                        <span className="font-bold text-slate-800">{selectedTrader.kycData.fullName}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[9px] uppercase">ID ({selectedTrader.kycData.idType})</span>
                        <span className="font-bold text-slate-800">{selectedTrader.kycData.idNumber}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Suspension/termination reason */}
                {selectedTrader.accountStatus === 'suspended' && selectedTrader.suspendReason && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs">
                    <span className="font-bold text-amber-900 block">Suspension Reason:</span>
                    <span className="text-amber-800">{selectedTrader.suspendReason}</span>
                  </div>
                )}
                {selectedTrader.accountStatus === 'terminated' && selectedTrader.terminateReason && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs">
                    <span className="font-bold text-rose-900 block">Termination Reason:</span>
                    <span className="text-rose-800">{selectedTrader.terminateReason}</span>
                  </div>
                )}

                {/* Order stats */}
                {(() => {
                  const traderOrders = orders.filter(o => o.userId === selectedTrader.uid);
                  const completed = traderOrders.filter(o => o.status === 'completed').length;
                  const pending = traderOrders.filter(o => o.status === 'pending').length;
                  const rejected = traderOrders.filter(o => o.status === 'rejected').length;
                  return (
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">Order History ({traderOrders.length} total)</span>
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div className="bg-emerald-50 p-2 rounded-lg text-center">
                          <div className="font-bold text-emerald-700 text-lg">{completed}</div>
                          <div className="text-emerald-600 text-[9px]">Completed</div>
                        </div>
                        <div className="bg-amber-50 p-2 rounded-lg text-center">
                          <div className="font-bold text-amber-700 text-lg">{pending}</div>
                          <div className="text-amber-600 text-[9px]">Pending</div>
                        </div>
                        <div className="bg-rose-50 p-2 rounded-lg text-center">
                          <div className="font-bold text-rose-700 text-lg">{rejected}</div>
                          <div className="text-rose-600 text-[9px]">Rejected</div>
                        </div>
                      </div>
                      {traderOrders.length > 0 && (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {traderOrders.slice(0, 10).map(o => (
                            <div key={o.id} className="flex justify-between items-center py-1.5 px-2 bg-slate-50 rounded-lg text-[10px] font-mono">
                              <span className="font-bold">#{o.id.substring(0,6).toUpperCase()}</span>
                              <span className={o.type === 'buy' ? 'text-emerald-700' : 'text-rose-700'}>{o.type.toUpperCase()} {o.cryptoAmount} USDT</span>
                              <span className={o.status === 'completed' ? 'text-emerald-600' : o.status === 'pending' ? 'text-amber-600' : 'text-rose-600'}>{o.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* KYC images */}
                {selectedTrader.kycData?.screenshotUrl && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">ID Document Photo</span>
                    <img src={selectedTrader.kycData.screenshotUrl} alt="ID proof" className="max-h-40 w-auto object-contain rounded-lg border border-slate-100" />
                  </div>
                )}
                {selectedTrader.kycData?.holdingIdUrl && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Selfie — Holding ID</span>
                    <img src={selectedTrader.kycData.holdingIdUrl} alt="Selfie proof" className="max-h-40 w-auto object-contain rounded-lg border border-slate-100" />
                  </div>
                )}

                {/* Account actions */}
                {selectedTrader.role !== 'admin' && selectedTrader.uid !== userProfile.uid && (
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Account Actions</span>

                    {selectedTrader.accountStatus !== 'active' && (
                      <button
                        onClick={() => handleReinstateUser(selectedTrader.uid, selectedTrader.email)}
                        disabled={isActioningTrader}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reinstate Account
                      </button>
                    )}

                    {selectedTrader.accountStatus === 'active' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={traderActionReason}
                          onChange={(e) => setTraderActionReason(e.target.value)}
                          placeholder="Enter reason for suspension or termination..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleSuspendUser(selectedTrader.uid, selectedTrader.email)}
                            disabled={isActioningTrader}
                            className="flex items-center justify-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Suspend
                          </button>
                          <button
                            onClick={() => handleTerminateUser(selectedTrader.uid, selectedTrader.email)}
                            disabled={isActioningTrader}
                            className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Terminate
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedTrader.accountStatus === 'suspended' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={traderActionReason}
                          onChange={(e) => setTraderActionReason(e.target.value)}
                          placeholder="Enter reason for termination..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                        />
                        <button
                          onClick={() => handleTerminateUser(selectedTrader.uid, selectedTrader.email)}
                          disabled={isActioningTrader}
                          className="w-full flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Terminate Account
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPLIANCE KYC AUDIT MODAL — read-only retained KYC view for deleted/scrubbed accounts */}
      <AnimatePresence>
        {complianceViewUser && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 text-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="bg-slate-950 text-white p-5 flex justify-between items-center shrink-0 rounded-t-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 font-mono">Compliance Audit — Retained KYC</span>
                  <h3 className="text-base font-extrabold mt-0.5">{complianceViewUser.email}</h3>
                </div>
                <button
                  onClick={() => setComplianceViewUser(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">

                {/* Account deletion summary */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono block">Account Scrub Summary</span>
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div>
                      <span className="text-amber-600 block text-[9px] uppercase">UID (Retained)</span>
                      <span className="font-bold text-amber-900 break-all text-[10px]">{complianceViewUser.uid}</span>
                    </div>
                    <div>
                      <span className="text-amber-600 block text-[9px] uppercase">Deleted At</span>
                      <span className="font-bold text-amber-900">
                        {complianceViewUser.deletedAt
                          ? formatNGT(complianceViewUser.deletedAt)
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-600 block text-[9px] uppercase">Account Status</span>
                      <span className="font-bold text-rose-700 uppercase">Scrubbed / Deleted</span>
                    </div>
                    <div>
                      <span className="text-amber-600 block text-[9px] uppercase">KYC Status</span>
                      <span className={`font-bold uppercase ${
                        complianceViewUser.kycStatus === 'approved' ? 'text-emerald-700' :
                        complianceViewUser.kycStatus === 'pending' ? 'text-amber-700' :
                        complianceViewUser.kycStatus === 'rejected' ? 'text-rose-700' :
                        'text-slate-500'
                      }`}>{complianceViewUser.kycStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Retained KYC identity data */}
                {complianceViewUser.kycData ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[9px] uppercase">Full Legal Name</span>
                        <span className="font-bold text-slate-800">{complianceViewUser.kycData.fullName}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[9px] uppercase">Document Type</span>
                        <span className="font-bold text-slate-800">
                          {complianceViewUser.kycData.idType === 'nin_paper' && 'NIN (Paper Slip)'}
                          {complianceViewUser.kycData.idType === 'nin_plastic' && 'NIN (Plastic Card)'}
                          {complianceViewUser.kycData.idType === 'voters_card' && "Voter's Card"}
                          {complianceViewUser.kycData.idType === 'drivers_license' && "Driver's License"}
                        </span>
                      </div>
                      <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[9px] uppercase">ID Number</span>
                        <span className="font-bold text-slate-800 tracking-widest">{complianceViewUser.kycData.idNumber}</span>
                      </div>
                      <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[9px] uppercase">KYC Submitted</span>
                        <span className="font-bold text-slate-800">
                          {formatNGT(complianceViewUser.kycData.submittedAt)}
                        </span>
                      </div>
                    </div>

                    {/* ID document photo */}
                    {complianceViewUser.kycData.screenshotUrl && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">ID Document Photo (Retained)</span>
                        <div className="border border-slate-100 rounded-xl p-2 bg-slate-50 flex justify-center">
                          <img
                            src={complianceViewUser.kycData.screenshotUrl}
                            alt="Retained ID document proof"
                            className="max-h-52 w-auto object-contain rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* Selfie with ID */}
                    {complianceViewUser.kycData.holdingIdUrl && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Selfie Holding ID (Retained)</span>
                        <div className="border border-slate-100 rounded-xl p-2 bg-slate-50 flex justify-center">
                          <img
                            src={complianceViewUser.kycData.holdingIdUrl}
                            alt="Retained selfie holding ID"
                            className="max-h-52 w-auto object-contain rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p className="text-xs text-slate-400 font-medium">No KYC documents were submitted by this account before deletion.</p>
                  </div>
                )}

                <div className="bg-slate-100 rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed border border-slate-200">
                  <strong className="text-slate-700 block mb-1">Compliance Note</strong>
                  This KYC data is retained per platform disclosure at account deletion time. It is for internal fraud investigation and regulatory compliance only. The user's login credentials and personal profile have been fully scrubbed.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISPUTE CHAT + RESOLUTION MODAL */}
      <AnimatePresence>
        {selectedDispute && (
          <div
            className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedDispute(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between shrink-0 rounded-t-3xl sm:rounded-t-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 font-mono">
                    {selectedDispute.status === 'open' ? '🔴 Open Dispute' : '✅ Resolved'}
                  </span>
                  <h3 className="text-base font-extrabold mt-0.5">Order #{selectedDispute.orderId.substring(0,6).toUpperCase()}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedDispute.userEmail}</p>
                </div>
                <button onClick={() => setSelectedDispute(null)} className="text-slate-400 hover:text-white cursor-pointer transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body — scrollable */}
              <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-4 text-xs">

                {/* Unified chat thread (initial message + evidence + live chat + resolution) */}
                <DisputeChat
                  disputeId={selectedDispute.id}
                  currentUserId={userProfile.uid}
                  currentUserEmail={userProfile.email}
                  currentUserRole="admin"
                  isOpen={selectedDispute.status === 'open'}
                  currentUserDisplayName={userProfile.kycData?.fullName?.trim().split(/\s+/).slice(0, 2).join(' ') || 'Admin'}
                  initialMessage={selectedDispute.message}
                  initialMessageAt={selectedDispute.createdAt}
                  initialMessageEmail={selectedDispute.userEmail}
                  initialMessageDisplayName={(() => {
                    const filer = kycUsers.find(u => u.email === selectedDispute.userEmail);
                    return filer?.kycData?.fullName?.trim().split(/\s+/).slice(0, 2).join(' ') || undefined;
                  })()}
                  evidenceUrls={selectedDispute.imageUrls}
                  adminResponse={selectedDispute.adminResponse}
                  resolvedAt={selectedDispute.resolvedAt}
                  onEvidenceClick={(url) => setLightboxUrl(url)}
                />

                {/* Resolve section — only when open */}
                {selectedDispute.status === 'open' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-mono block text-[9px] uppercase">Close & Resolve Dispute</span>
                    <p className="text-[10px] text-slate-400">Write a final resolution note (optional) and mark this dispute as resolved.</p>
                    <textarea
                      rows={2}
                      value={disputeResponseText}
                      onChange={(e) => setDisputeResponseText(e.target.value)}
                      placeholder="Final resolution note (optional)…"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#008751]"
                    />
                    <button
                      onClick={() => handleResolveDispute(selectedDispute.id)}
                      disabled={isResolvingDispute}
                      className="w-full bg-[#008751] hover:bg-[#007043] text-white py-3 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60"
                    >
                      {isResolvingDispute ? 'Resolving...' : '✓ Mark as Resolved'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMAGE LIGHTBOX */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setLightboxUrl(null)}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              src={lightboxUrl}
              alt="Evidence"
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

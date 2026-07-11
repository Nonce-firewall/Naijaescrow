import React, { useState, useRef, useEffect } from 'react';
import { formatNGT, formatNGTDate } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, ArrowUpRight, ArrowDownLeft, Clock, CircleCheck as CheckCircle2, Circle as XCircle, CircleAlert as AlertCircle, Upload, Receipt, Smartphone, Eye, Lock, Bell, ChevronRight, UserCheck, FileText, Camera, Coins, Search, ListFilter as Filter, Check, MessageSquare, OctagonAlert as AlertOctagon, ShieldOff, X, RotateCw, Copy } from 'lucide-react';
import { UserProfile, Order, AdminSettings, Announcement, KYCData, CoinListing, Dispute } from '../types';
import { createOrder, submitKYC, submitDispute } from '../lib/dbHelpers';
import DisputeChat from './DisputeChat';
import TradingJourney from './TradingJourney';
import { compressImage } from '../lib/imageCompressor';

interface UserDashboardProps {
  userProfile: UserProfile;
  orders: Order[];
  settings: AdminSettings;
  announcements: Announcement[];
  coins: CoinListing[];
  disputes?: Dispute[];
  hasMoreDisputes?: boolean;
  onLoadMoreDisputes?: () => void;
  liveNgnRate?: number | null;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
  mobileBulletinOpen?: boolean;
  onCloseMobileBulletin?: () => void;
  onBulletinCountChange?: (count: number) => void;
}

export default function UserDashboard({
  userProfile,
  orders,
  settings,
  announcements,
  coins = [],
  disputes = [],
  hasMoreDisputes = false,
  onLoadMoreDisputes,
  liveNgnRate = null,
  addToast,
  onRefresh,
  mobileBulletinOpen = false,
  onCloseMobileBulletin,
  onBulletinCountChange,
}: UserDashboardProps) {
  
  // Tab states: 'trade' | 'history' | 'kyc' | 'disputes'
  const [activeTab, setActiveTab] = useState<'trade' | 'history' | 'kyc' | 'disputes'>('trade');

  // Mobile swipe-between-tabs support
  const tabOrder = useRef<Array<'trade' | 'history' | 'kyc' | 'disputes'>>(['trade', 'history', 'kyc', 'disputes']);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeLockedRef = useRef<'horizontal' | 'vertical' | null>(null);

  const handleTabTouchStart = (e: React.TouchEvent) => {
    // Ignore swipe tracking if the touch starts inside a horizontally
    // scrollable region (e.g. the order history table) so users can still
    // scroll it sideways without triggering a tab switch.
    if ((e.target as HTMLElement).closest('[data-horizontal-scroll]')) {
      touchStartRef.current = null;
      swipeLockedRef.current = null;
      return;
    }
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipeLockedRef.current = null;
  };

  const handleTabTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (!swipeLockedRef.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swipeLockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (swipeLockedRef.current === 'horizontal' && e.cancelable) {
      e.preventDefault();
    }
  };

  const handleTabTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const isHorizontalSwipe = swipeLockedRef.current === 'horizontal';
    touchStartRef.current = null;
    swipeLockedRef.current = null;

    if (!isHorizontalSwipe || Math.abs(dx) < 50) return;

    const order = tabOrder.current;
    const currentIndex = order.indexOf(activeTab);
    if (dx < 0 && currentIndex < order.length - 1) {
      setActiveTab(order[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      setActiveTab(order[currentIndex - 1]);
    }
  };

  // Mobile pull-to-refresh support
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartRef = useRef<{ x: number; y: number } | null>(null);
  const pullAxisRef = useRef<'horizontal' | 'vertical' | null>(null);
  const PULL_THRESHOLD = 70;
  const MAX_PULL = 110;

  const handlePageTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing || window.scrollY > 0) {
      pullStartRef.current = null;
      return;
    }
    const t = e.touches[0];
    pullStartRef.current = { x: t.clientX, y: t.clientY };
    pullAxisRef.current = null;
  };

  const handlePageTouchMove = (e: React.TouchEvent) => {
    if (!pullStartRef.current || isRefreshing) return;
    const t = e.touches[0];
    const dx = t.clientX - pullStartRef.current.x;
    const dy = t.clientY - pullStartRef.current.y;

    if (!pullAxisRef.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      pullAxisRef.current = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
    }

    if (pullAxisRef.current !== 'vertical' || dy <= 0 || window.scrollY > 0) {
      setPullDistance(0);
      return;
    }

    setPullDistance(Math.min(dy * 0.5, MAX_PULL));
    if (e.cancelable) e.preventDefault();
  };

  const handlePageTouchEnd = () => {
    if (!pullStartRef.current) return;
    pullStartRef.current = null;
    pullAxisRef.current = null;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 600);
    } else {
      setPullDistance(0);
    }
  };
  
  // Trade form states
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [network, setNetwork] = useState<'BSC' | 'Tron' | 'Polygon'>('BSC');
  const [selectedCoinId, setSelectedCoinId] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<number | ''>('');
  const [screenshot, setScreenshot] = useState<string>('');

  // Live CoinGecko prices for coins with coinGeckoId (in USD)
  const [liveCoinPrices, setLiveCoinPrices] = useState<Record<string, number>>({});

  // Coin search and network filter state
  const [coinSearchQuery, setCoinSearchQuery] = useState<string>('');
  const [networkFilter, setNetworkFilter] = useState<string>('all');

  // Screen-size detection for coin display limits (3 mobile / 6 desktop)
  // Initialize to false (desktop) as a safe default; effect corrects it immediately.
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 640);
    handleResize(); // sync on mount
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch live USD prices from CoinGecko for coins that have a coinGeckoId
  useEffect(() => {
    const geckoIds = (coins || [])
      .filter(c => c.published !== false && c.coinGeckoId)
      .map(c => c.coinGeckoId!)
      .filter((v, i, arr) => arr.indexOf(v) === i); // unique
    if (geckoIds.length === 0) return;
    const controller = new AbortController();
    const idsParam = geckoIds.join(',');
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const prices: Record<string, number> = {};
        for (const id of geckoIds) {
          if (data[id]?.usd) prices[id] = data[id].usd;
        }
        setLiveCoinPrices(prev => ({ ...prev, ...prices }));
      })
      .catch(() => {});
    const interval = setInterval(() => {
      fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`)
        .then(r => r.json())
        .then(data => {
          const prices: Record<string, number> = {};
          for (const id of geckoIds) {
            if (data[id]?.usd) prices[id] = data[id].usd;
          }
          setLiveCoinPrices(prev => ({ ...prev, ...prices }));
        })
        .catch(() => {});
    }, 60000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [coins]);

  // Filter active (published) coins
  const activeCoinsList = (coins || []).filter(c => c.published !== false);

  // Group active coins by unique symbol
  interface GroupedCoin {
    symbol: string;
    name: string;
    logoUrl?: string;
    variants: CoinListing[];
  }

  const groupedCoins: GroupedCoin[] = [];
  const symbolToGroupMap: { [symbol: string]: GroupedCoin } = {};

  activeCoinsList.forEach((coin) => {
    const symbolKey = coin.symbol.trim().toUpperCase();
    if (!symbolToGroupMap[symbolKey]) {
      const group: GroupedCoin = {
        symbol: coin.symbol,
        name: coin.name,
        logoUrl: coin.logoUrl,
        variants: []
      };
      symbolToGroupMap[symbolKey] = group;
      groupedCoins.push(group);
    }
    symbolToGroupMap[symbolKey].variants.push(coin);
  });

  // Filter grouped coins list by search and network filters
  const filteredGroupedCoins = groupedCoins.filter((group) => {
    const matchesSearch = 
      group.name.toLowerCase().includes(coinSearchQuery.toLowerCase()) ||
      group.symbol.toLowerCase().includes(coinSearchQuery.toLowerCase());
    
    // Group matches network filter if any of its variants matches
    const matchesNetwork = 
      networkFilter === 'all' || 
      group.variants.some(v => v.network.toLowerCase().includes(networkFilter.toLowerCase()));
      
    return matchesSearch && matchesNetwork;
  });

  // Default display limit: 3 on mobile, 6 on desktop — lifted when user searches
  const isFilteringActive = coinSearchQuery.trim() !== '' || networkFilter !== 'all';
  const coinDisplayLimit = isSmallScreen ? 3 : 6;
  const displayedGroupedCoins = isFilteringActive
    ? filteredGroupedCoins
    : filteredGroupedCoins.slice(0, coinDisplayLimit);
  const hiddenCoinCount = isFilteringActive ? 0 : Math.max(0, filteredGroupedCoins.length - coinDisplayLimit);

  // Coin the user *explicitly* selected by clicking one in the picker.
  // Undefined / empty selectedCoinId means "no coin chosen yet" → USDT / live-rate mode.
  const selectedCoin = activeCoinsList.find(c => c.id === selectedCoinId) ?? null;

  // activeCoin drives all UI (coin picker highlight, wallet/network display, order fields).
  // Falls back to the first published coin so the picker always shows something.
  const activeCoin = selectedCoin ?? (activeCoinsList.length > 0 ? activeCoinsList[0] : null);
  
  // User bank details for selling
  const [userBankName, setUserBankName] = useState('');
  const [userAccountNumber, setUserAccountNumber] = useState('');
  const [userAccountName, setUserAccountName] = useState('');
  const [sellTxHash, setSellTxHash] = useState('');
  const [userWalletAddress, setUserWalletAddress] = useState('');

  // Order history pagination
  const [ordersLimit, setOrdersLimit] = useState(5);

  // Local notification centre
  interface LocalNotif {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    timestamp: number;
  }
  const [localNotifs, setLocalNotifs] = useState<LocalNotif[]>([]);
  const prevOrdersRef = useRef<Order[] | null>(null);
  // Tracks whether the initial orders fetch has completed for this mount.
  // Until hydrated, any change to `orders` is initial hydration, not a real update.
  const ordersHydratedRef = useRef(false);
  const prevProfileRef = useRef<UserProfile | null>(null);
  
  // Upload drag state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // KYC form states
  const [kycName, setKycName] = useState('');
  const [kycIdType, setKycIdType] = useState<KYCData['idType']>('nin_paper');
  const [kycIdNumber, setKycIdNumber] = useState('');
  const [kycScreenshot, setKycScreenshot] = useState<string>('');
  const [kycHoldingId, setKycHoldingId] = useState<string>('');
  const kycFileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

  // Live Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Active receipt for popup
  const [viewReceipt, setViewReceipt] = useState<Order | null>(null);
  const [disputeShowAll, setDisputeShowAll] = useState(false);
  const [expandedDisputeIds, setExpandedDisputeIds] = useState<Set<string>>(new Set());
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Dispute state
  const [disputeMessage, setDisputeMessage] = useState('');
  const [disputeImageUrls, setDisputeImageUrls] = useState<string[]>([]);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState<string | null>(null);

  // Image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Collapsible announcements (collapsed by default — click title to expand)
  const [expandedAnnIds, setExpandedAnnIds] = useState<string[]>([]);
  const toggleAnn = (id: string) => setExpandedAnnIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Dismissed announcements (per-user, stored in localStorage)
  const DISMISSED_KEY = `dismissed_anns_${userProfile.uid}`;
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; }
  });
  const dismissAnnouncement = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated)); } catch {}
  };

  // Private announcements filter (exclude dismissed)
  const privateAnnouncements = announcements.filter(
    (ann) => (ann.scope === 'private' || ann.scope === 'all') && ann.isActive && !dismissedIds.includes(ann.id)
  );

  // Display name: first two words of KYC full name, fallback to email prefix
  const displayName = userProfile.kycStatus === 'approved' && userProfile.kycData?.fullName
    ? userProfile.kycData.fullName.trim().split(/\s+/).slice(0, 2).join(' ')
    : userProfile.email.split('@')[0];

  // Effective rates: live market price + admin-set markup
  // SELL rate drives all display; BUY rate is applied only at buy-order creation time
  const effectiveSellRate = liveNgnRate
    ? Math.round(liveNgnRate) + settings.usdtSellMarkup
    : settings.usdtSellMarkup;
  const effectiveBuyRate = liveNgnRate
    ? Math.round(liveNgnRate) + settings.usdtBuyMarkup
    : settings.usdtBuyMarkup;

  // Rate logic:
  //  • No coin explicitly chosen, OR the chosen coin is USDT → use the live effective rate
  //    which differs between buy and sell (admin sell-markup vs buy-markup).
  //  • A coin marked as price-pegged → also uses the live effective rate (Buy/Sell aware),
  //    so its price synchronizes with the current effective rate as users switch tabs.
  //  • Any other non-pegged coin (BTC, ETH …) → use that coin's admin-set static rate
  //    (same for both directions, unaffected by Buy/Sell switching).
  const isLiveRateMode =
    !selectedCoin ||
    selectedCoin.symbol.trim().toUpperCase() === 'USDT' ||
    selectedCoin.pricePegged === true;

  // When a coin has a CoinGecko ID, its rate = liveCoinPrice(USD) × effectiveNGN/USD rate
  const liveCoinUsdPrice = selectedCoin?.coinGeckoId ? liveCoinPrices[selectedCoin.coinGeckoId] : undefined;
  const isCoinGeckoLive = !!selectedCoin?.coinGeckoId && liveCoinUsdPrice !== undefined;

  const activeRate = isCoinGeckoLive
    ? Math.round(liveCoinUsdPrice! * (tradeType === 'buy' ? effectiveBuyRate : effectiveSellRate))
    : isLiveRateMode
    ? (tradeType === 'buy' ? effectiveBuyRate : effectiveSellRate)
    : selectedCoin!.rate;
  const calculatedNgnAmount = cryptoAmount ? cryptoAmount * activeRate : 0;

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${label} copied!`, 'success');
    } catch {
      addToast('Copy failed — please select and copy manually.', 'error');
    }
  };

  // Fee calculations (BUY only)
  const activeFeePercent = (activeCoin?.feePercentage ?? 0);
  const feeAmount = cryptoAmount && activeFeePercent > 0 ? Number(cryptoAmount) * activeFeePercent / 100 : 0;
  const netCryptoAmount = cryptoAmount ? Number(cryptoAmount) - feeAmount : 0;
  const activeMinTrade = activeCoin?.minTradeAmount ?? 1;
  const belowMinimum = !!(cryptoAmount && Number(cryptoAmount) > 0 && Number(cryptoAmount) < activeMinTrade);

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle Drag Leave
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Convert File to Base64 with compression
  const processFile = (file: File, isKyc: boolean = false, isHolding: boolean = false) => {
    if (!file.type.startsWith('image/')) {
      addToast('Please upload an image file (PNG, JPG, or WEBP)', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('Image size should be less than 10MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      const base64 = await compressImage(raw, 250);
      if (isHolding) {
        setKycHoldingId(base64);
      } else if (isKyc) {
        setKycScreenshot(base64);
      } else {
        setScreenshot(base64);
      }
      addToast('Image uploaded & optimised!', 'success');
    };
    reader.onerror = () => {
      addToast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent, isKyc: boolean = false, isHolding: boolean = false) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], isKyc, isHolding);
    }
  };

  // Handle Input File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isKyc: boolean = false, isHolding: boolean = false) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], isKyc, isHolding);
    }
  };

  // Live Webcam Camera Handlers
  const startCamera = async (mode?: 'user' | 'environment') => {
    const targetMode = mode ?? facingMode;
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: targetMode, width: 640, height: 480 } });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      addToast('Could not access camera. Please ensure camera permissions are allowed in your browser settings.', 'error');
    }
  };

  // Toggle between front and back camera while the live feed is active
  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    await startCamera(newMode);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (facingMode === 'user') {
            // Front camera: un-mirror the display flip so text reads correctly in the capture
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const raw = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = await compressImage(raw, 250);
          setKycHoldingId(base64);
          addToast('Snapshot captured successfully!', 'success');
          stopCamera();
        }
      } catch (err) {
        console.error(err);
        addToast('Failed to capture snapshot.', 'error');
      }
    }
  };

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Submit Order
  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userProfile.kycStatus !== 'approved') {
      addToast('Your KYC must be approved by the admin before trading.', 'error');
      return;
    }

    if (userProfile.accountStatus === 'suspended') {
      addToast('Your account is suspended. You cannot place new orders.', 'error');
      return;
    }

    if (userProfile.accountStatus === 'terminated') {
      addToast('Your account has been terminated. Trading is permanently disabled.', 'error');
      return;
    }

    if (userProfile.accountStatus === 'pending_reactivation') {
      addToast('Your account is pending admin reactivation. Contact support to reclaim your account.', 'error');
      return;
    }

    if (!cryptoAmount || cryptoAmount <= 0) {
      addToast(`Please provide a valid ${activeCoin ? activeCoin.symbol : 'USDT'} amount.`, 'error');
      return;
    }

    if (Number(cryptoAmount) < activeMinTrade) {
      addToast(`Minimum trade for ${activeCoin?.symbol ?? 'USDT'} is ${activeMinTrade} ${activeCoin?.symbol ?? 'USDT'}.`, 'error');
      return;
    }

    if (tradeType === 'buy' && !userWalletAddress.trim()) {
      addToast('Please enter your crypto receiving wallet address.', 'error');
      return;
    }

    if (!screenshot) {
      addToast('Please upload a screenshot to verify your transfer.', 'error');
      return;
    }

    if (tradeType === 'sell') {
      if (!userBankName || !userAccountNumber || !userAccountName) {
        addToast('Please provide all NGN bank details to receive payment.', 'error');
        return;
      }
      // NUBAN format: exactly 10 digits
      if (!/^\d{10}$/.test(userAccountNumber)) {
        addToast('Bank account number must be exactly 10 digits (Nigerian NUBAN format).', 'error');
        return;
      }
      if (!sellTxHash.trim()) {
        addToast('Please provide the blockchain transaction hash for your crypto transfer.', 'error');
        return;
      }
      // Validate TX hash format per network family
      const effectiveNetwork = (activeCoin?.network ?? network).toLowerCase();
      const isTron = effectiveNetwork.includes('tron');
      const isEvm = ['bsc', 'bep20', 'polygon', 'ethereum', 'eth', 'arbitrum', 'optimism', 'avalanche', 'evm'].some(k => effectiveNetwork.includes(k));
      const tx = sellTxHash.trim();
      if (isTron) {
        if (!/^[0-9a-fA-F]{64}$/.test(tx)) {
          addToast('Invalid Tron TxID — must be exactly 64 hex characters (no 0x prefix).', 'error');
          return;
        }
      } else if (isEvm) {
        if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) {
          addToast('Invalid TX hash — EVM hashes start with 0x followed by 64 hex characters.', 'error');
          return;
        }
      } else {
        // Custom / non-EVM, non-Tron blockchain: accept any plausible tx hash
        if (tx.length < 10 || !/^[A-Za-z0-9]+$/.test(tx)) {
          addToast('Invalid transaction hash — enter the valid TxID from your wallet for this blockchain network.', 'error');
          return;
        }
      }
    }

    setIsSubmittingOrder(true);
    try {
      const bankDetails = tradeType === 'sell' ? {
        bankName: userBankName,
        accountNumber: userAccountNumber,
        accountName: userAccountName
      } : undefined;

      const adminBank = tradeType === 'buy' ? {
        bankName: settings.ngnBankName,
        accountNumber: settings.ngnAccountNumber,
        accountName: settings.ngnAccountName
      } : undefined;

      const adminWallet = tradeType === 'sell' 
        ? (activeCoin ? activeCoin.walletAddress : settings.wallets[network]) 
        : undefined;

      const orderNetwork = activeCoin ? activeCoin.network : network;
      const orderToken = activeCoin ? activeCoin.symbol : 'USDT';

      await createOrder(
        userProfile.uid,
        userProfile.email,
        tradeType,
        Number(cryptoAmount),
        activeRate,
        orderNetwork,
        screenshot,
        bankDetails,
        adminBank,
        adminWallet,
        orderToken,
        tradeType === 'sell' ? sellTxHash.trim() : undefined,
        tradeType === 'buy' ? userWalletAddress.trim() : undefined
      );

      addToast('Escrow order submitted successfully!', 'success');
      // Reset form
      setCryptoAmount('');
      setScreenshot('');
      setUserBankName('');
      setUserAccountNumber('');
      setUserAccountName('');
      setSellTxHash('');
      setUserWalletAddress('');
      setActiveTab('history');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to create order: ' + err.message, 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ── Notification tracking: orders ────────────────────────────────────────
  useEffect(() => {
    if (prevOrdersRef.current === null) {
      // First render: sync snapshot, not hydrated yet.
      prevOrdersRef.current = orders;
      return;
    }
    if (!ordersHydratedRef.current) {
      // Second render is the initial fetch completing (empty or populated).
      // Sync silently — we don't know yet which orders are "genuinely new".
      prevOrdersRef.current = orders;
      ordersHydratedRef.current = true;
      return;
    }
    const prev = prevOrdersRef.current;
    const notifs: LocalNotif[] = [];

    orders.forEach((ord) => {
      const existed = prev.find((p) => p.id === ord.id);
      if (!existed) {
        // New order inserted
        const typeLabel = ord.type === 'buy' ? 'Buy' : 'Sell';
        notifs.push({
          id: `new-${ord.id}`,
          message: `📋 ${typeLabel} order #${ord.id.substring(0, 6).toUpperCase()} submitted and is pending admin review.`,
          type: 'info',
          timestamp: Date.now(),
        });
      } else if (existed.status !== ord.status) {
        if (ord.status === 'completed') {
          const label = ord.type === 'buy'
            ? `${ord.cryptoAmount} ${ord.token} purchase`
            : `₦${ord.ngnAmount.toLocaleString()} sell payout`;
          notifs.push({
            id: `done-${ord.id}`,
            message: `✅ Order #${ord.id.substring(0, 6).toUpperCase()} completed! Your ${label} has been approved.`,
            type: 'success',
            timestamp: Date.now(),
          });
        } else if (ord.status === 'rejected') {
          const suffix = ord.rejectionReason ? ` Reason: ${ord.rejectionReason}` : '';
          notifs.push({
            id: `rejected-${ord.id}`,
            message: `❌ Order #${ord.id.substring(0, 6).toUpperCase()} was declined.${suffix}`,
            type: 'error',
            timestamp: Date.now(),
          });
        } else if (ord.status === 'pending') {
          notifs.push({
            id: `pending-${ord.id}`,
            message: `⏳ Order #${ord.id.substring(0, 6).toUpperCase()} is awaiting admin review.`,
            type: 'info',
            timestamp: Date.now(),
          });
        }
      }
    });

    prevOrdersRef.current = orders;
    if (notifs.length > 0) {
      setLocalNotifs((prev) => [...notifs, ...prev].slice(0, 30));
    }
  }, [orders]);

  // ── Notification tracking: profile (KYC + account status) ────────────────
  useEffect(() => {
    if (prevProfileRef.current === null) {
      prevProfileRef.current = userProfile;
      return;
    }
    const prev = prevProfileRef.current;
    const notifs: LocalNotif[] = [];

    if (prev.kycStatus !== userProfile.kycStatus) {
      if (userProfile.kycStatus === 'approved') {
        notifs.push({ id: `kyc-approved-${Date.now()}`, message: '🎉 KYC Approved! Your identity is verified and trading is now unlocked.', type: 'success', timestamp: Date.now() });
      } else if (userProfile.kycStatus === 'rejected') {
        notifs.push({ id: `kyc-rejected-${Date.now()}`, message: '⚠️ KYC Rejected. Review the feedback and resubmit with clearer documents.', type: 'error', timestamp: Date.now() });
      } else if (userProfile.kycStatus === 'none') {
        notifs.push({ id: `kyc-reset-${Date.now()}`, message: 'ℹ️ KYC has been reset by admin. Please resubmit your identity documents.', type: 'info', timestamp: Date.now() });
      } else if (userProfile.kycStatus === 'pending') {
        notifs.push({ id: `kyc-pending-${Date.now()}`, message: '⏳ KYC documents submitted. You will be notified once reviewed.', type: 'info', timestamp: Date.now() });
      }
    }

    if (prev.accountStatus !== userProfile.accountStatus) {
      if (userProfile.accountStatus === 'suspended') {
        notifs.push({ id: `susp-${Date.now()}`, message: '🚫 Your account has been suspended. Contact support for assistance.', type: 'error', timestamp: Date.now() });
      } else if (userProfile.accountStatus === 'active' && prev.accountStatus === 'suspended') {
        notifs.push({ id: `unsusp-${Date.now()}`, message: '✅ Suspension lifted! Your account is active and you can trade again.', type: 'success', timestamp: Date.now() });
      } else if (userProfile.accountStatus === 'terminated') {
        notifs.push({ id: `term-${Date.now()}`, message: '❌ Your account has been permanently terminated. Contact support.', type: 'error', timestamp: Date.now() });
      } else if (userProfile.accountStatus === 'pending_reactivation') {
        notifs.push({ id: `react-${Date.now()}`, message: '⏳ Your account is pending admin reactivation. Contact support.', type: 'info', timestamp: Date.now() });
      } else if (userProfile.accountStatus === 'active' && prev.accountStatus === 'pending_reactivation') {
        notifs.push({ id: `reactdone-${Date.now()}`, message: '✅ Account reactivated! You can trade again.', type: 'success', timestamp: Date.now() });
      }
    }

    prevProfileRef.current = userProfile;
    if (notifs.length > 0) {
      setLocalNotifs((prev) => [...notifs, ...prev].slice(0, 30));
    }
  }, [userProfile]);

  // ── Sync bulletin count up to parent (for Navbar badge) ──────────────────
  useEffect(() => {
    onBulletinCountChange?.(localNotifs.length + privateAnnouncements.length);
  }, [localNotifs.length, privateAnnouncements.length, onBulletinCountChange]);

  // Submit KYC Request
  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycName || !kycIdNumber || !kycScreenshot || !kycHoldingId) {
      addToast('Please fill in all fields, upload your ID document, and provide your Holding ID photo.', 'error');
      return;
    }
    // Full legal name must contain at least a first and last name
    if (kycName.trim().split(/\s+/).length < 2) {
      addToast('Please enter your full legal name — first and last name required.', 'error');
      return;
    }
    // ID number: 6–20 alphanumeric characters (covers NIN 11 digits, Voter card ~19 chars, DL)
    if (!/^[A-Z0-9]{6,20}$/i.test(kycIdNumber.trim())) {
      addToast('ID number must be 6–20 alphanumeric characters (no spaces or symbols).', 'error');
      return;
    }

    setIsSubmittingKyc(true);
    try {
      await submitKYC(userProfile.uid, {
        fullName: kycName,
        idType: kycIdType,
        idNumber: kycIdNumber,
        screenshotUrl: kycScreenshot,
        holdingIdUrl: kycHoldingId
      });
      addToast('KYC documents submitted for admin review.', 'success');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to submit KYC: ' + err.message, 'error');
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  return (
    <div
      className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 font-sans"
      onTouchStart={handlePageTouchStart}
      onTouchMove={handlePageTouchMove}
      onTouchEnd={handlePageTouchEnd}
    >
      {/* Pull-to-refresh indicator — mobile only */}
      <div
        className="sm:hidden flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: isRefreshing ? 40 : pullDistance }}
      >
        <RotateCw
          className={`w-5 h-5 text-[#008751] ${isRefreshing ? 'animate-spin' : ''}`}
          style={!isRefreshing ? { transform: `rotate(${Math.min(pullDistance / PULL_THRESHOLD, 1) * 360}deg)` } : undefined}
        />
      </div>

      {/* Suspended account banner */}
      {userProfile.accountStatus === 'suspended' && (
        <motion.div
          className="mb-6 bg-amber-50 border border-amber-300 rounded-2xl p-5 flex gap-4 items-start"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ShieldOff className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-900 text-sm">Account Suspended</div>
            <div className="text-xs text-amber-800 mt-1">Your account has been temporarily suspended by the administrator. You cannot place new orders during this period.</div>
            {userProfile.suspendReason && (
              <div className="mt-2 text-xs text-amber-900 bg-amber-100 rounded-lg px-3 py-2 font-mono">
                <span className="font-bold">Reason: </span>{userProfile.suspendReason}
              </div>
            )}
            <div className="mt-2 text-xs text-amber-700">Contact support to appeal or resolve the issue.</div>
          </div>
        </motion.div>
      )}

      {/* Pending reactivation account banner */}
      {userProfile.accountStatus === 'pending_reactivation' && (
        <motion.div
          className="mb-6 bg-blue-50 border border-blue-300 rounded-2xl p-5 flex gap-4 items-start"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Clock className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-blue-900 text-sm">Account Reactivation Required</div>
            <div className="text-xs text-blue-800 mt-1">Our records show you previously deleted this account. For your security, an administrator must approve reactivation before you can access the platform. Please contact admin to reclaim your account and trading history.</div>
            <div className="mt-2 text-xs text-blue-700">Use the Support button (bottom-right) to reach the admin team.</div>
          </div>
        </motion.div>
      )}

      {/* Terminated account banner */}
      {userProfile.accountStatus === 'terminated' && (
        <motion.div
          className="mb-6 bg-red-50 border border-red-300 rounded-2xl p-5 flex gap-4 items-start"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-900 text-sm">Account Terminated</div>
            <div className="text-xs text-red-800 mt-1">Your account has been permanently terminated and all trading functions are disabled.</div>
            {userProfile.terminateReason && (
              <div className="mt-2 text-xs text-red-900 bg-red-100 rounded-lg px-3 py-2 font-mono">
                <span className="font-bold">Reason: </span>{userProfile.terminateReason}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Real-time exchange rate banner */}
      <motion.div
        className="bg-[#1A1A1A] text-white rounded-2xl sm:rounded-3xl px-4 py-4 sm:p-6 shadow-sm border border-[#E0E7E0]/10 flex items-center justify-between gap-4 mb-5 sm:mb-8 relative overflow-hidden"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="relative z-10 space-y-1 sm:space-y-2">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#00FF85] bg-[#E6F4EA]/10 border border-[#E6F4EA]/20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full inline-block">
            Live Exchange Rate
          </span>
          <div className="flex items-baseline gap-1 sm:gap-2 min-w-0">
            <span className="font-bold tracking-tight italic text-[#00FF85] leading-none tabular-nums"
              style={{ fontSize: 'clamp(1.4rem, 6vw, 3rem)' }}>
              ₦{effectiveSellRate.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-sm text-gray-400 font-mono shrink-0">/USDT</span>
          </div>
          <p className="hidden sm:block text-xs text-gray-400 max-w-xl">
            Seamless local bank transfers of Naira for USDT with guaranteed dispute resolution. Verified by 9ija Escrow Ledger.
          </p>
        </div>

        <div className="relative z-10 text-right shrink-0">
          <span className="text-[9px] text-gray-400 font-mono block uppercase tracking-wider">Trader</span>
          <span className="text-sm font-bold text-white mt-0.5 block truncate max-w-[120px] sm:max-w-none">{displayName}</span>
          <span className={`text-[11px] font-bold flex items-center gap-1 mt-0.5 justify-end ${
            userProfile.kycStatus === 'approved' ? 'text-[#00FF85]' : 'text-amber-400'
          }`}>
            {userProfile.kycStatus === 'approved' && <CheckCircle2 className="w-3 h-3 text-[#00FF85]" />}
            {userProfile.kycStatus === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
            {userProfile.kycStatus === 'rejected' && <XCircle className="w-3 h-3 text-rose-400" />}
            {userProfile.kycStatus === 'none' && <AlertCircle className="w-3 h-3 text-amber-400" />}
            <span className="hidden sm:inline">KYC </span>{userProfile.kycStatus.toUpperCase()}
          </span>
        </div>

        <div className="absolute -right-12 -bottom-12 opacity-[0.03]">
          <div className="w-44 h-44 border-[24px] border-white rounded-full"></div>
        </div>
      </motion.div>

      {/* Trading Journey visualization */}
      <TradingJourney
        orders={orders}
        effectiveBuyRate={effectiveBuyRate}
        effectiveSellRate={effectiveSellRate}
        userProfile={userProfile}
      />

      {/* Grid: Main Panel (left) & Updates notice (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column (Tabs & Active Form) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Navigation Tabs — mobile: compact segmented pill switch */}
          <div className="sm:hidden flex items-center bg-white border border-[#E0E7E0] rounded-full p-1 gap-0.5">
            <button
              onClick={() => setActiveTab('trade')}
              className={`relative flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-[11px] font-bold ${
                activeTab === 'trade' ? 'text-white' : 'text-gray-500'
              }`}
            >
              {activeTab === 'trade' && (
                <motion.div layoutId="mobile-tab-indicator" className="absolute inset-0 bg-[#008751] rounded-full" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
              )}
              <TrendingUp className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10">Trade</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`relative flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-[11px] font-bold ${
                activeTab === 'history' ? 'text-white' : 'text-gray-500'
              }`}
            >
              {activeTab === 'history' && (
                <motion.div layoutId="mobile-tab-indicator" className="absolute inset-0 bg-[#008751] rounded-full" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
              )}
              <Receipt className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10">History</span>
              {orders.length > 0 && (
                <span className={`absolute -top-1 right-1 z-20 min-w-[14px] h-[14px] px-0.5 text-[8px] font-bold rounded-full flex items-center justify-center leading-none ${
                  activeTab === 'history' ? 'bg-white text-[#008751]' : 'bg-[#008751] text-white'
                }`}>
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('kyc')}
              className={`relative flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-[11px] font-bold ${
                activeTab === 'kyc' ? 'text-white' : 'text-gray-500'
              }`}
            >
              {activeTab === 'kyc' && (
                <motion.div layoutId="mobile-tab-indicator" className="absolute inset-0 bg-[#008751] rounded-full" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
              )}
              <UserCheck className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10">KYC</span>
              {userProfile.kycStatus === 'approved' && (
                <span className={`absolute -top-1 right-1 z-20 w-3 h-3 rounded-full flex items-center justify-center ${
                  activeTab === 'kyc' ? 'bg-white' : 'bg-emerald-500'
                }`}>
                  <Check className={`w-2 h-2 ${activeTab === 'kyc' ? 'text-[#008751]' : 'text-white'}`} />
                </span>
              )}
              {userProfile.kycStatus === 'pending' && (
                <span className="absolute -top-1 right-1 z-20 w-3 h-3 rounded-full bg-amber-400 flex items-center justify-center">
                  <Clock className="w-2 h-2 text-white" />
                </span>
              )}
              {userProfile.kycStatus === 'rejected' && (
                <span className="absolute -top-1 right-1 z-20 w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center">
                  <X className="w-2 h-2 text-white" />
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('disputes')}
              className={`relative flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-[11px] font-bold ${
                activeTab === 'disputes' ? 'text-white' : 'text-gray-500'
              }`}
            >
              {activeTab === 'disputes' && (
                <motion.div layoutId="mobile-tab-indicator" className="absolute inset-0 bg-[#008751] rounded-full" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
              )}
              <MessageSquare className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10">Disputes</span>
              {disputes.filter(d => d.status === 'open').length > 0 && (
                <span className={`absolute -top-1 right-1 z-20 min-w-[14px] h-[14px] px-0.5 text-[8px] font-bold rounded-full flex items-center justify-center leading-none ${
                  activeTab === 'disputes' ? 'bg-white text-[#008751]' : 'bg-amber-500 text-white'
                }`}>
                  {disputes.filter(d => d.status === 'open').length}
                </span>
              )}
            </button>
          </div>

          {/* Navigation Tabs — desktop: pill card grid */}
          <div className="hidden sm:grid grid-cols-4 gap-3">
            {/* Tab: Start Order */}
            <button
              onClick={() => setActiveTab('trade')}
              className={`relative flex flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold cursor-pointer ${
                activeTab === 'trade'
                  ? 'text-white'
                  : 'bg-white border border-[#E0E7E0] text-gray-500 hover:border-[#008751]/40 hover:text-[#008751]'
              }`}
            >
              {activeTab === 'trade' && (
                <motion.div layoutId="desktop-tab-indicator" className="absolute inset-0 bg-[#008751] rounded-2xl shadow-md shadow-[#008751]/20" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
              )}
              <TrendingUp className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10 text-xs text-center leading-tight">Start Order</span>
            </button>

            {/* Tab: Order History */}
            <button
              onClick={() => setActiveTab('history')}
              className={`relative flex flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold cursor-pointer ${
                activeTab === 'history'
                  ? 'text-white'
                  : 'bg-white border border-[#E0E7E0] text-gray-500 hover:border-[#008751]/40 hover:text-[#008751]'
              }`}
            >
              {activeTab === 'history' && (
                <motion.div layoutId="desktop-tab-indicator" className="absolute inset-0 bg-[#008751] rounded-2xl shadow-md shadow-[#008751]/20" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
              )}
              <Receipt className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10 text-xs text-center leading-tight">Order History</span>
              {orders.length > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 z-20 min-w-[18px] h-[18px] px-1 text-[9px] font-bold rounded-full flex items-center justify-center leading-none border-2 border-[#F7F9F7] ${
                  activeTab === 'history' ? 'bg-white text-[#008751]' : 'bg-[#008751] text-white'
                }`}>
                  {orders.length}
                </span>
              )}
            </button>

            {/* Tab: KYC */}
            <button
              onClick={() => setActiveTab('kyc')}
              className={`relative flex flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold cursor-pointer ${
                activeTab === 'kyc'
                  ? 'text-white'
                  : 'bg-white border border-[#E0E7E0] text-gray-500 hover:border-[#008751]/40 hover:text-[#008751]'
              }`}
            >
              {activeTab === 'kyc' && (
                <motion.div layoutId="desktop-tab-indicator" className="absolute inset-0 bg-[#008751] rounded-2xl shadow-md shadow-[#008751]/20" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
              )}
              <UserCheck className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10 text-xs text-center leading-tight">Identity (KYC)</span>
              {userProfile.kycStatus === 'approved' && (
                <span className={`absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#F7F9F7] ${
                  activeTab === 'kyc' ? 'bg-white' : 'bg-emerald-500'
                }`}>
                  <Check className={`w-2.5 h-2.5 ${activeTab === 'kyc' ? 'text-[#008751]' : 'text-white'}`} />
                </span>
              )}
              {userProfile.kycStatus === 'pending' && (
                <span className="absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full bg-amber-400 border-2 border-[#F7F9F7] flex items-center justify-center">
                  <Clock className="w-2.5 h-2.5 text-white" />
                </span>
              )}
              {userProfile.kycStatus === 'rejected' && (
                <span className="absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full bg-rose-500 border-2 border-[#F7F9F7] flex items-center justify-center">
                  <X className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </button>

            {/* Tab: Disputes */}
            <button
              onClick={() => setActiveTab('disputes')}
              className={`relative flex flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold cursor-pointer ${
                activeTab === 'disputes'
                  ? 'text-white'
                  : 'bg-white border border-[#E0E7E0] text-gray-500 hover:border-[#008751]/40 hover:text-[#008751]'
              }`}
            >
              {activeTab === 'disputes' && (
                <motion.div layoutId="desktop-tab-indicator" className="absolute inset-0 bg-[#008751] rounded-2xl shadow-md shadow-[#008751]/20" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
              )}
              <MessageSquare className="relative z-10 w-3.5 h-3.5 shrink-0" />
              <span className="relative z-10 text-xs text-center leading-tight">Disputes</span>
              {disputes.filter(d => d.status === 'open').length > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 z-20 min-w-[18px] h-[18px] px-1 text-[9px] font-bold rounded-full flex items-center justify-center leading-none border-2 border-[#F7F9F7] ${
                  activeTab === 'disputes' ? 'bg-white text-[#008751]' : 'bg-amber-500 text-white'
                }`}>
                  {disputes.filter(d => d.status === 'open').length}
                </span>
              )}
            </button>
          </div>

          {/* Swipeable tab panel area (mobile: swipe left/right between Trade / History / KYC / Disputes) */}
          <div
            className="touch-pan-y"
            onTouchStart={handleTabTouchStart}
            onTouchMove={handleTabTouchMove}
            onTouchEnd={handleTabTouchEnd}
          >
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
          {/* TAB 1: Start Order (Trade) */}
          {activeTab === 'trade' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E0E7E0] shadow-sm">
              {userProfile.kycStatus !== 'approved' ? (
                <div className="text-center py-12 px-4 space-y-4">
                  <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Trading Portal Locked</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    In compliance with NGN local P2P trading regulations, you must verify your identity first. Once verified, Buy and Sell operation unlock instantly.
                  </p>
                  {userProfile.kycStatus === 'none' && (
                    <button
                      onClick={() => setActiveTab('kyc')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition"
                    >
                      Verify Identity Now
                    </button>
                  )}
                  {userProfile.kycStatus === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-full text-xs">
                      <Clock className="w-4 h-4 animate-spin" /> Pending Admin Approval
                    </span>
                  )}
                  {userProfile.kycStatus === 'rejected' && (
                    <div className="space-y-3">
                      <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold bg-rose-50 px-3 py-1.5 rounded-full text-xs">
                        KYC Rejected
                      </span>
                      <p className="text-xs text-rose-500">Reason: {userProfile.kycData?.rejectionReason || 'No details provided.'}</p>
                      <button
                        onClick={() => setActiveTab('kyc')}
                        className="text-emerald-600 hover:text-emerald-700 text-xs font-bold underline block mx-auto"
                      >
                        Correct details & Retry
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleTradeSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight">Create Escrow Contract</h3>
                    <p className="text-xs text-gray-500">Set up a secure transfer that locks assets until verified.</p>
                  </div>

                  {/* Buy/Sell Selector */}
                  <div className="grid grid-cols-2 gap-4 bg-[#F7F9F7] p-1.5 rounded-2xl border border-[#E0E7E0]">
                    <button
                      type="button"
                      onClick={() => {
                        setTradeType('buy');
                        setScreenshot('');
                      }}
                      className={`relative py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer ${
                        tradeType === 'buy' ? 'text-white' : 'text-gray-500 hover:text-[#1A1A1A]'
                      }`}
                    >
                      {tradeType === 'buy' && (
                        <motion.div layoutId="trade-type-indicator" className="absolute inset-0 bg-[#008751] rounded-xl shadow-sm" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                      )}
                      <ArrowDownLeft className="relative z-10 w-4 h-4" />
                      <span className="relative z-10">Buy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTradeType('sell');
                        setScreenshot('');
                      }}
                      className={`relative py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer ${
                        tradeType === 'sell' ? 'text-white' : 'text-gray-500 hover:text-[#1A1A1A]'
                      }`}
                    >
                      {tradeType === 'sell' && (
                        <motion.div layoutId="trade-type-indicator" className="absolute inset-0 bg-rose-600 rounded-xl shadow-sm" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                      )}
                      <ArrowUpRight className="relative z-10 w-4 h-4" />
                      <span className="relative z-10">Sell</span>
                    </button>
                  </div>

                  {/* Coin & Network Selection */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="block text-xs font-extrabold text-[#1A1A1A] uppercase tracking-wider">
                        Select Asset & Blockchain Network
                      </label>
                      
                      {/* Search and network filters */}
                      {coins && coins.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Search box */}
                          <div className="relative">
                            <input
                              type="text"
                              value={coinSearchQuery}
                              onChange={(e) => setCoinSearchQuery(e.target.value)}
                              placeholder="Search assets..."
                              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-40 focus:outline-none focus:ring-1 focus:ring-[#008751] bg-white text-slate-800 placeholder-slate-400"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                          
                          {/* Network filter pills */}
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            {(['all', 'BSC', 'Tron', 'Polygon'] as const).map((net) => (
                              <button
                                key={net}
                                type="button"
                                onClick={() => setNetworkFilter(net)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition uppercase ${
                                  networkFilter === net
                                    ? 'bg-[#008751] text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {net === 'all' ? 'All' : net}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {coins && coins.length > 0 ? (
                      <>
                        {filteredGroupedCoins.length === 0 ? (
                          <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                            <p className="text-xs text-slate-400">No active assets match your filters.</p>
                            <button
                              type="button"
                              onClick={() => { setCoinSearchQuery(''); setNetworkFilter('all'); }}
                              className="mt-2 text-xs text-[#008751] font-bold underline cursor-pointer"
                            >
                              Reset filters
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Coin grid — max-w-3xl caps runaway width while allowing 3 columns on lg */}
                            <div className="max-w-3xl">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                {displayedGroupedCoins.map((group) => {
                                  const isSelected = activeCoin ? (activeCoin.symbol.trim().toUpperCase() === group.symbol.trim().toUpperCase()) : false;
                                  return (
                                    <button
                                      key={group.symbol}
                                      type="button"
                                      onClick={() => {
                                        // Default to the first available variant for this token asset
                                        if (group.variants.length > 0) {
                                          setSelectedCoinId(group.variants[0].id);
                                          setNetwork(group.variants[0].network as any);
                                        }
                                      }}
                                      className={`p-2.5 sm:p-3.5 rounded-2xl border text-left cursor-pointer transition-[transform,box-shadow,border-color] duration-150 flex items-center gap-2.5 sm:gap-3 relative hover:-translate-y-0.5 hover:shadow-sm ${
                                        isSelected
                                          ? 'border-[#008751] bg-[#F0F7F2] ring-1 ring-[#008751]'
                                          : 'border-[#E0E7E0] hover:border-slate-300 bg-white'
                                      }`}
                                    >
                                      {/* Logo — smaller on mobile */}
                                      <div className="shrink-0">
                                        {group.logoUrl ? (
                                          <img
                                            src={group.logoUrl}
                                            alt={group.name}
                                            className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#008751]/10 flex items-center justify-center text-[#008751] font-bold text-[10px] sm:text-xs border border-[#008751]/20">
                                            {group.symbol.slice(0, 3).toUpperCase()}
                                          </div>
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1 space-y-0.5">
                                        <span className="block font-extrabold text-[11px] sm:text-[12px] text-slate-900 truncate leading-tight">
                                          {group.name}
                                        </span>
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="bg-slate-100 text-slate-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md leading-none uppercase">
                                            {group.symbol}
                                          </span>
                                          <span className="bg-slate-50 text-slate-600 text-[8px] font-semibold px-1.5 py-0.5 rounded-md leading-none border border-slate-100">
                                            {group.variants.length} {group.variants.length === 1 ? 'Network' : 'Networks'}
                                          </span>
                                        </div>
                                        <span className="block text-[11px] text-[#008751] font-extrabold mt-0.5">
                                          ₦{(
                                            group.variants[0]?.coinGeckoId && liveCoinPrices[group.variants[0]?.coinGeckoId!]
                                              ? Math.round(liveCoinPrices[group.variants[0]!.coinGeckoId!] * (tradeType === 'buy' ? effectiveBuyRate : effectiveSellRate))
                                              : group.variants[0]?.pricePegged
                                              ? (tradeType === 'buy' ? effectiveBuyRate : effectiveSellRate)
                                              : group.variants[0]?.rate ?? 0
                                          ).toLocaleString()} <span className="text-[9px] text-gray-400 font-normal">{group.variants[0]?.coinGeckoId && liveCoinPrices[group.variants[0]?.coinGeckoId!] ? 'live' : group.variants[0]?.pricePegged ? 'live rate' : 'base rate'}</span>
                                        </span>
                                      </div>

                                      {isSelected && (
                                        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-[#008751] text-white p-0.5 rounded-full shrink-0">
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* "More assets" nudge — shown when list is clipped */}
                              {hiddenCoinCount > 0 && (
                                <p className="mt-2.5 text-[10px] text-slate-400 text-center">
                                  +{hiddenCoinCount} more asset{hiddenCoinCount !== 1 ? 's' : ''} — use the search box above to find them
                                </p>
                              )}
                            </div>

                            {/* Network type selector specifically for the selected grouped asset */}
                            {activeCoin && (
                              (() => {
                                const selectedGroup = groupedCoins.find(g => g.symbol.trim().toUpperCase() === activeCoin.symbol.trim().toUpperCase());
                                const variants = selectedGroup ? selectedGroup.variants : [];
                                if (variants.length === 0) return null;

                                return (
                                  <div className="mt-4 p-4.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                                    <span className="block text-[10px] font-extrabold text-[#1A1A1A] uppercase tracking-wider mb-3">
                                      Select Blockchain Network for {activeCoin.name} ({activeCoin.symbol})
                                    </span>
                                    <div className="flex flex-wrap gap-2.5">
                                      {variants.map((variant) => {
                                        const isVarSelected = selectedCoinId === variant.id;
                                        return (
                                          <button
                                            key={variant.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedCoinId(variant.id);
                                              setNetwork(variant.network as any);
                                            }}
                                            className={`px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all duration-200 flex items-center gap-2.5 shadow-sm hover:scale-[1.01] ${
                                              isVarSelected
                                                ? 'border-[#008751] bg-[#F0F7F2] text-[#008751] ring-1 ring-[#008751]'
                                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                                            }`}
                                          >
                                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${isVarSelected ? 'bg-[#008751] scale-110' : 'bg-slate-300'}`} />
                                            <div className="text-left leading-tight">
                                              <span className="block font-extrabold">{variant.network}</span>
                                              <span className="block text-[9px] text-slate-400 font-medium">Rate: ₦{(variant.coinGeckoId && liveCoinPrices[variant.coinGeckoId]
                                                ? Math.round(liveCoinPrices[variant.coinGeckoId] * (tradeType === 'buy' ? effectiveBuyRate : effectiveSellRate))
                                                : variant.pricePegged
                                                ? (tradeType === 'buy' ? effectiveBuyRate : effectiveSellRate)
                                                : variant.rate
                                              ).toLocaleString()}/{variant.symbol}{variant.coinGeckoId && liveCoinPrices[variant.coinGeckoId] ? ' (live)' : variant.pricePegged ? ' (pegged)' : ''}</span>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {(['BSC', 'Tron', 'Polygon'] as const).map((net) => (
                          <button
                            key={net}
                            type="button"
                            onClick={() => setNetwork(net)}
                            className={`p-3 rounded-xl border text-center text-xs font-bold cursor-pointer transition ${
                              network === net
                                ? 'border-[#008751] bg-[#E6F4EA] text-[#008751]'
                                : 'border-[#E0E7E0] hover:border-gray-300 text-gray-600'
                            }`}
                          >
                            {net === 'BSC' && 'BSC (BEP20)'}
                            {net === 'Tron' && 'Tron (TRC20)'}
                            {net === 'Polygon' && 'Polygon'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Amount in {activeCoin ? activeCoin.symbol : 'USDT'}
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="number"
                          required
                          min={activeMinTrade}
                          step="any"
                          value={cryptoAmount}
                          onChange={(e) => setCryptoAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                          className={`block w-full px-4 py-3 border rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm font-semibold text-[#1A1A1A] ${belowMinimum ? 'border-rose-400' : 'border-[#E0E7E0]'}`}
                          placeholder={`Min. ${activeMinTrade} ${activeCoin ? activeCoin.symbol : 'USDT'}`}
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-xs font-bold text-gray-400">
                          {activeCoin ? activeCoin.symbol : 'USDT'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                        Amount to Receive / Pay (NGN)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="text"
                          readOnly
                          value={calculatedNgnAmount ? `₦${calculatedNgnAmount.toLocaleString()}` : '₦0'}
                          className="block w-full px-4 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none text-sm font-bold text-gray-700 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Min trade warning */}
                  {belowMinimum && (
                    <p className="text-xs text-rose-600 font-semibold -mt-3">
                      Minimum trade for {activeCoin?.symbol} on {activeCoin?.network} is <span className="font-extrabold">{activeMinTrade} {activeCoin?.symbol}</span>
                    </p>
                  )}

                  {/* Fee Breakdown — BUY only, shown when fee > 0 and user has typed an amount */}
                  {tradeType === 'buy' && activeFeePercent > 0 && cryptoAmount && Number(cryptoAmount) > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-extrabold text-amber-700 uppercase tracking-wider text-[10px]">Fee Breakdown</span>
                        <span className="text-amber-600 font-mono text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">{activeFeePercent}% platform fee</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Trade amount</span>
                        <span className="font-semibold">{cryptoAmount} {activeCoin?.symbol}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Platform fee ({activeFeePercent}%)</span>
                        <span className="font-semibold text-rose-600">− {feeAmount.toFixed(4)} {activeCoin?.symbol}</span>
                      </div>
                      <div className="flex justify-between border-t border-amber-200 pt-1.5 mt-0.5">
                        <span className="font-bold text-slate-800">You receive (net)</span>
                        <span className="font-extrabold text-[#008751]">{netCryptoAmount.toFixed(4)} {activeCoin?.symbol}</span>
                      </div>
                    </div>
                  )}

                  {/* Transaction Summary Card */}
                  {activeCoin && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {activeCoin.logoUrl ? (
                            <img 
                              src={activeCoin.logoUrl} 
                              alt={activeCoin.name} 
                              className="w-12 h-12 object-contain" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#008751]/10 flex items-center justify-center text-[#008751] font-bold text-xs border border-[#008751]/20">
                              {activeCoin.symbol.slice(0, 3).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-[#008751] text-white p-0.5 rounded-full border-2 border-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Selected Asset</span>
                          <span className="font-extrabold text-sm text-slate-800 leading-none">{activeCoin.name}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold bg-slate-200/60 px-1.5 py-0.5 rounded">Token: {activeCoin.symbol}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded">Network: {activeCoin.network}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="sm:text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Rate</span>
                        <span className="font-extrabold text-sm text-[#008751]">₦{activeRate.toLocaleString()}/$</span>
                        <span className="block text-[9px] text-slate-400 font-medium">Escrow Protected Guarantee</span>
                        {liveNgnRate && (
                          <span className="block text-[9px] text-slate-400 mt-0.5">
                            Market: <span className="text-slate-600 font-semibold">₦{Math.round(liveNgnRate).toLocaleString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Conditional Flow Instructions */}
                  <div className="bg-[#F0F7F2] border border-[#D1E6D8] rounded-2xl p-5 space-y-4">
                    {tradeType === 'buy' ? (
                      <>
                        <h4 className="font-bold text-[#008751] text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-5 h-5 text-[#008751]" />
                          Step 1: Transfer NGN to Admin Account
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Please transfer exactly <span className="font-bold text-[#008751]">{calculatedNgnAmount ? `₦${calculatedNgnAmount.toLocaleString()}` : 'the calculated amount'}</span> to the admin bank credentials below. Your {activeCoin ? activeCoin.symbol : 'USDT'} will be released to your registered blockchain address once the admin validates the receipt.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-[#D1E6D8] text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-mono">BANK NAME</span>
                            <span className="font-bold text-[#1A1A1A]">{settings.ngnBankName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-mono">ACCOUNT NUMBER</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[#1A1A1A]">{settings.ngnAccountNumber}</span>
                              <button type="button" onClick={() => copyToClipboard(settings.ngnAccountNumber, 'Account number')} className="p-0.5 rounded text-[#008751] hover:bg-[#008751]/10 transition cursor-pointer shrink-0" title="Copy account number">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-mono">ACCOUNT NAME</span>
                            <span className="font-bold text-[#1A1A1A]">{settings.ngnAccountName}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-5 h-5 text-rose-600" />
                          Step 1: Transfer {activeCoin ? activeCoin.symbol : 'USDT'} to Admin Escrow Wallet
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Please deposit exactly <span className="font-bold text-[#1A1A1A]">{cryptoAmount || 0} {activeCoin ? activeCoin.symbol : 'USDT'}</span> on the <span className="font-bold text-[#1A1A1A]">{activeCoin ? activeCoin.network : network}</span> network to the admin wallet address below. Do not send on other networks.
                        </p>
                        <div className="bg-white p-3 rounded-xl border border-rose-100 text-xs flex flex-col justify-center">
                          <span className="text-[10px] text-gray-400 block font-mono">ADMIN {activeCoin ? activeCoin.network : network} WALLET ADDRESS</span>
                          <div className="flex items-start gap-2 py-1">
                            <span className="font-mono font-bold text-[#1A1A1A] break-all select-all flex-1">
                              {activeCoin ? activeCoin.walletAddress : (settings.wallets[network] || '')}
                            </span>
                            <button type="button" onClick={() => copyToClipboard(activeCoin ? activeCoin.walletAddress : (settings.wallets[network] || ''), 'Wallet address')} className="p-0.5 rounded text-[#008751] hover:bg-[#008751]/10 transition cursor-pointer shrink-0 mt-0.5" title="Copy wallet address">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* If buying, user must input their crypto wallet address to receive crypto */}
                  {tradeType === 'buy' && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-[#1A1A1A] text-sm">Step 2: Enter Your Crypto Receiving Address</h4>
                      <p className="text-xs text-gray-500">
                        Provide the {activeCoin ? activeCoin.network : network} wallet address where you want to receive your {activeCoin ? activeCoin.symbol : 'USDT'} after admin approval.
                      </p>
                      <input
                        type="text"
                        required
                        value={userWalletAddress}
                        onChange={(e) => setUserWalletAddress(e.target.value)}
                        placeholder={`Your ${activeCoin ? activeCoin.network : network} wallet address`}
                        className="block w-full px-3 py-2.5 border border-[#E0E7E0] rounded-xl text-xs font-mono bg-[#F7F9F7] text-[#1A1A1A]"
                      />
                    </div>
                  )}

                  {/* If selling, user must input NGN details to receive cash */}
                  {tradeType === 'sell' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-[#1A1A1A] text-sm">Step 2: Enter Your NGN Receiving Bank Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                          <input
                            type="text"
                            required
                            value={userBankName}
                            onChange={(e) => setUserBankName(e.target.value)}
                            placeholder="e.g. GTBank"
                            className="block w-full px-3 py-2.5 border border-[#E0E7E0] rounded-xl text-xs bg-[#F7F9F7]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
                          <input
                            type="text"
                            required
                            value={userAccountNumber}
                            onChange={(e) => setUserAccountNumber(e.target.value)}
                            placeholder="10 Digits"
                            maxLength={10}
                            className="block w-full px-3 py-2.5 border border-[#E0E7E0] rounded-xl text-xs font-mono bg-[#F7F9F7]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
                          <input
                            type="text"
                            required
                            value={userAccountName}
                            onChange={(e) => setUserAccountName(e.target.value)}
                            placeholder="As shown in Bank App"
                            className="block w-full px-3 py-2.5 border border-[#E0E7E0] rounded-xl text-xs bg-[#F7F9F7]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Blockchain Tx Hash input for sell orders */}
                  {tradeType === 'sell' && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-[#1A1A1A] text-sm">Step 3: Enter Blockchain Transaction Hash</h4>
                      <p className="text-xs text-gray-500">Paste the transaction hash (TxID) from your crypto wallet after sending to the admin wallet above.</p>
                      <input
                        type="text"
                        required
                        value={sellTxHash}
                        onChange={(e) => setSellTxHash(e.target.value)}
                        placeholder="e.g. 0xabc123... or TxID from your wallet"
                        className="block w-full px-3 py-2.5 border border-[#E0E7E0] rounded-xl text-xs font-mono bg-[#F7F9F7] text-[#1A1A1A]"
                      />
                    </div>
                  )}

                  {/* Step 3/4: Screenshot Upload (Drag & Drop + Click) */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#1A1A1A] text-sm">
                      {tradeType === 'buy' ? 'Step 3: Upload NGN Transfer Receipt' : 'Step 4: Upload Crypto Transfer Receipt'}
                    </h4>
                    <p className="text-xs text-gray-500">Provide an authentic screenshot proof of the transfer to trigger admin approval.</p>
                    
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, false)}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border border-dashed rounded-3xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                        isDragging 
                          ? 'border-[#008751] bg-[#F0F7F2]' 
                          : screenshot 
                            ? 'border-[#D1E6D8] bg-[#F7F9F7]' 
                            : 'border-[#E0E7E0] hover:border-gray-400 bg-[#F7F9F7]/50'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleFileChange(e, false)}
                        accept="image/*"
                        className="hidden"
                      />
                      {screenshot ? (
                        <div className="relative group max-w-[200px]">
                          <img 
                            src={screenshot} 
                            alt="Payment receipt preview" 
                            className="h-32 w-auto object-cover rounded-xl shadow-sm border border-[#E0E7E0]" 
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change Photo</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 bg-white rounded-full border border-[#E0E7E0] shadow-sm text-gray-500">
                            <Upload className="w-5 h-5 text-[#008751]" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#1A1A1A] block">Drag & Drop transfer screenshot</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">Or click to browse files (max 2MB)</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmittingOrder}
                      className={`w-full py-4 rounded-xl text-sm font-bold text-center text-white transition shadow-sm cursor-pointer flex justify-center items-center gap-2 ${
                        tradeType === 'buy'
                          ? 'bg-[#008751] hover:bg-[#007043]'
                          : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                    >
                      {isSubmittingOrder ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Saving escrow contract...
                        </>
                      ) : (
                        <>
                          {tradeType === 'buy' ? 'Submit Buy Order Proof' : 'Submit Sell Order Proof'}
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}
            </div>
          )}

          {/* TAB 2: Order History */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl border border-[#E0E7E0] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#E0E7E0]">
                <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight">Your Escrow Transactions</h3>
                <p className="text-xs text-gray-500">Track and view receipts for all buy/sell requests.</p>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">No transactions recorded</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Start a buy or sell contract from the "Start Order" tab to record your first ledger item.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto" data-horizontal-scroll>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-mono border-b border-slate-100">
                        <th className="py-4 px-6">ID / Date</th>
                        <th className="py-4 px-6">Type</th>
                        <th className="py-4 px-6">Crypto Amount</th>
                        <th className="py-4 px-6">NGN Payout</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {orders.slice(0, ordersLimit).map((ord) => {
                        const isBuy = ord.type === 'buy';
                        const dateStr = formatNGTDate(ord.createdAt);

                        return (
                          <tr key={ord.id} className="hover:bg-slate-50/50">
                            <td className="py-4 px-6 font-mono">
                              <span className="font-bold text-slate-700 text-xs block">#{ord.id.substring(0, 6).toUpperCase()}</span>
                              <span className="text-[10px] text-slate-400">{dateStr}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                                isBuy 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {isBuy ? ord.token === "USDT" ? `Buy USDT` : `Buy ${ord.token}/USDT` : ord.token === "USDT" ? `Sell USDT` : `Sell ${ord.token}/USDT`}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-700">
                              {ord.cryptoAmount} {ord.token}
                              <span className="block text-[10px] text-slate-400 font-mono">{ord.network}</span>
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-800">
                              ₦{ord.ngnAmount.toLocaleString()}
                              <span className="block text-[10px] text-slate-400 font-mono">Rate: ₦{ord.rate.toLocaleString()}/{ord.token}</span>
                            </td>
                            <td className="py-4 px-6">
                              {ord.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                  <Clock className="w-3 h-3 animate-spin" /> Pending
                                </span>
                              )}
                              {ord.status === 'completed' && (
                                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" /> Completed
                                </span>
                              )}
                              {ord.status === 'rejected' && (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                    <XCircle className="w-3 h-3" /> Declined
                                  </span>
                                  {ord.rejectionReason && (
                                    <span className="block text-[9px] text-rose-500 font-medium truncate max-w-[120px]">
                                      {ord.rejectionReason}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => setViewReceipt(ord)}
                                className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 rounded-lg cursor-pointer transition inline-flex items-center justify-center border border-transparent hover:border-emerald-100"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {orders.length > ordersLimit && (
                    <div className="px-6 py-4 border-t border-[#E0E7E0] text-center">
                      <button
                        onClick={() => setOrdersLimit((prev) => prev + 5)}
                        className="text-xs font-bold text-[#008751] hover:text-[#007043] border border-[#D1E6D8] hover:border-[#008751] bg-[#F7F9F7] hover:bg-[#F0F7F2] px-5 py-2 rounded-xl transition cursor-pointer"
                      >
                        Load more orders ({orders.length - ordersLimit} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* TAB 3: KYC Submission Form */}
          {activeTab === 'kyc' && (
            <div className="bg-white p-6 rounded-3xl border border-[#E0E7E0] shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight">Identity Verification</h3>
                <p className="text-xs text-gray-500">Provide official details to verify account safety.</p>
              </div>

              {userProfile.kycStatus === 'approved' && (
                <div className="bg-[#F0F7F2] border border-[#D1E6D8] rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#E6F4EA] text-[#008751] flex items-center justify-center mx-auto shadow-inner">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-[#1A1A1A] text-base">Account Fully Verified!</h4>
                  <p className="text-xs text-gray-600 max-w-md mx-auto">
                    Your KYC records (submitted by {userProfile.kycData?.fullName}) are manually approved by the 9ija Escrow security team. You can operate the Buy and Sell terminals with zero limitations.
                  </p>
                  <div className="bg-white p-3.5 rounded-xl border border-[#D1E6D8] max-w-sm mx-auto text-left text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-mono">FULL NAME:</span>
                      <span className="font-bold text-[#1A1A1A]">{userProfile.kycData?.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-mono">ID TYPE:</span>
                      <span className="font-bold text-[#1A1A1A]">
                        {userProfile.kycData?.idType === 'nin_paper' && 'NIN (Paper Slip)'}
                        {userProfile.kycData?.idType === 'nin_plastic' && 'NIN (Premium Plastic Card)'}
                        {userProfile.kycData?.idType === 'voters_card' && "Voter's Card"}
                        {userProfile.kycData?.idType === 'drivers_license' && "Driver's License"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-mono">ID NUMBER:</span>
                      <span className="font-bold text-[#1A1A1A] font-mono">{userProfile.kycData?.idNumber}</span>
                    </div>
                  </div>
                </div>
              )}

              {userProfile.kycStatus === 'pending' && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-amber-950 text-base">Verification in Progress</h4>
                  <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                    Your submitted identity card ({userProfile.kycData?.fullName}) is currently in the admin verification queue. Most documents are verified within 10-20 minutes.
                  </p>
                  <div className="bg-white p-3.5 rounded-xl border border-amber-100 max-w-sm mx-auto text-left text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-mono font-medium">SUBMITTED ON:</span>
                      <span className="font-bold text-gray-800">
                        {userProfile.kycData?.submittedAt ? formatNGT(userProfile.kycData.submittedAt) : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(userProfile.kycStatus === 'none' || userProfile.kycStatus === 'rejected') && (
                <form onSubmit={handleKycSubmit} className="space-y-6">
                  {userProfile.kycStatus === 'rejected' && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-950 rounded-xl p-4 flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm">Previous Verification Rejected</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-bold text-rose-900">Reason:</span> {userProfile.kycData?.rejectionReason || 'Uploaded document was blurry. Please upload a high-resolution screenshot.'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Please update your details below and re-submit for review.</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        required
                        value={kycName}
                        onChange={(e) => setKycName(e.target.value)}
                        placeholder="e.g. John Obi Okechukwu"
                        className="block w-full px-4 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm font-semibold text-[#1A1A1A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1">
                        Select Document Type
                      </label>
                      <select
                        value={kycIdType}
                        onChange={(e) => setKycIdType(e.target.value as KYCData['idType'])}
                        className="block w-full px-4 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm font-semibold text-[#1A1A1A]"
                      >
                        <option value="nin_paper">NIN Paper Slip (Direct PDF Screenshot)</option>
                        <option value="nin_plastic">NIN Premium Plastic ID Card</option>
                        <option value="voters_card">Voter's Card</option>
                        <option value="drivers_license">Driver's License</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      Identity Document Number (NIN / Voter / DL Number)
                    </label>
                    <input
                      type="text"
                      required
                      value={kycIdNumber}
                      onChange={(e) => setKycIdNumber(e.target.value)}
                      placeholder="e.g. 12345678901 (11 digits for NIN)"
                      className="block w-full px-4 py-3 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm font-semibold text-[#1A1A1A]"
                    />
                  </div>

                  {/* ID Document Photo Dropzone */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1">
                      Upload Identity Document Photo
                    </label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, true)}
                      onClick={() => kycFileInputRef.current?.click()}
                      className={`border border-dashed rounded-3xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                        isDragging 
                          ? 'border-[#008751] bg-[#F0F7F2]' 
                          : kycScreenshot 
                            ? 'border-[#D1E6D8] bg-[#F7F9F7]' 
                            : 'border-[#E0E7E0] hover:border-gray-400 bg-[#F7F9F7]/50'
                      }`}
                    >
                      <input
                        type="file"
                        ref={kycFileInputRef}
                        onChange={(e) => handleFileChange(e, true)}
                        accept="image/*"
                        className="hidden"
                      />
                      {kycScreenshot ? (
                        <div className="relative group max-w-[200px]">
                          <img 
                            src={kycScreenshot} 
                            alt="ID preview" 
                            className="h-28 w-auto object-cover rounded-xl shadow-sm border border-[#E0E7E0]" 
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change Photo</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 bg-white rounded-full border border-[#E0E7E0] shadow-sm text-gray-500">
                            <FileText className="w-5 h-5 text-[#008751]" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#1A1A1A] block">Drag & Drop identity image</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">Or click to browse files (max 2MB)</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Holding ID Photo (Upload or Live Camera snap) */}
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Selfie Verification: Hold ID beside Face
                      </label>
                      <p className="text-[11px] text-gray-500 leading-relaxed bg-amber-50 border border-amber-200/50 rounded-xl p-3">
                        👉 <strong>Security Guideline:</strong> Please hold your physical ID card with your <strong>left hand</strong> beside your face. Ensure that both your full face and the details on the ID card are completely clear and legible. <strong>Live camera capture is required</strong> — file uploads are not accepted for this step.
                      </p>
                    </div>

                    {/* Live Camera — only option; file upload intentionally removed for security */}
                    <div className="border border-[#E0E7E0] rounded-3xl p-5 bg-[#F7F9F7]/30 flex flex-col items-center justify-center gap-3 min-h-[220px]">
                      {isCameraActive ? (
                        <div className="w-full flex flex-col items-center gap-3">
                          <div className="relative rounded-2xl overflow-hidden border-2 border-[#008751] w-full max-w-[360px] aspect-[4/3] bg-black">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                            />
                            {/* Camera mode badge */}
                            <span className="absolute bottom-2 left-2 bg-black/60 text-white font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
                            </span>
                            {/* Switch camera button */}
                            <button
                              type="button"
                              onClick={switchCamera}
                              title="Switch Camera"
                              className="absolute top-2 right-2 bg-black/50 hover:bg-black/75 text-white rounded-full p-2 transition cursor-pointer"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex gap-2 w-full max-w-[360px]">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer text-center font-sans"
                            >
                              Take Photo
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : kycHoldingId ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="max-w-[260px] mx-auto text-center">
                            <img
                              src={kycHoldingId}
                              alt="Captured selfie with ID"
                              className="h-36 w-auto object-cover rounded-xl shadow-sm border border-[#E0E7E0] mx-auto"
                            />
                            <span className="text-[9px] text-[#008751] font-bold uppercase tracking-wider block mt-2">✅ Photo Captured!</span>
                          </div>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="bg-white hover:bg-[#F7F9F7] text-[#008751] font-bold px-4 py-2 rounded-xl text-xs border border-[#008751]/20 cursor-pointer transition shadow-sm"
                          >
                            Retake Photo
                          </button>
                        </div>
                      ) : (
                        <div className="text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-[#008751]/10 flex items-center justify-center mx-auto text-[#008751]">
                            <Camera className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-[#1A1A1A] block">Live Camera Capture Required</span>
                            <span className="text-[10px] text-gray-400 block">File uploads are not accepted for this step</span>
                          </div>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="bg-white hover:bg-[#F7F9F7] text-[#008751] font-bold px-4 py-2 rounded-xl text-xs border border-[#008751]/20 cursor-pointer transition shadow-sm"
                          >
                            Open Camera
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmittingKyc}
                      className="w-full py-4 rounded-xl text-sm font-bold text-center text-white bg-[#008751] hover:bg-[#007043] transition shadow-sm cursor-pointer flex justify-center items-center gap-2"
                    >
                      {isSubmittingKyc ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Submitting for audit...
                        </>
                      ) : (
                        'Submit Verification Files'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: Disputes */}
          {activeTab === 'disputes' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E0E7E0] shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight">My Disputes</h3>
                  <p className="text-xs text-gray-500">Track and follow up on your trade disputes with the 9ija Escrow team.</p>
                </div>
                {disputes.filter(d => d.status === 'open').length > 0 && (
                  <span className="shrink-0 bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200">
                    {disputes.filter(d => d.status === 'open').length} Open
                  </span>
                )}
              </div>

              {disputes.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">No Disputes Filed</h4>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                    If you have an issue with a rejected order, you can open a dispute from the receipt in your Order History.
                  </p>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#008751] hover:text-[#007043] border border-[#008751]/30 hover:border-[#008751] bg-[#F7F9F7] hover:bg-[#F0F7F2] px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    Go to Order History
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {disputes.map((d) => {
                    const isExpanded = expandedDisputeIds.has(d.id);
                    const isOpen = d.status === 'open';
                    const toggleExpand = () => setExpandedDisputeIds(prev => {
                      const next = new Set(prev);
                      if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
                      return next;
                    });

                    return (
                      <div
                        key={d.id}
                        className={`rounded-2xl border overflow-hidden transition-colors ${
                          isOpen ? 'border-amber-200' : 'border-[#E0E7E0]'
                        }`}
                      >
                        {/* Dispute header row */}
                        <button
                          onClick={toggleExpand}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer transition-colors ${
                            isOpen ? 'bg-amber-50/60 hover:bg-amber-50' : 'bg-white hover:bg-[#F7F9F7]'
                          }`}
                        >
                          <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                            isOpen ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-[#1A1A1A]">
                                Order #{d.orderId.substring(0, 6).toUpperCase()}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                isOpen
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {isOpen ? '● OPEN' : '✓ RESOLVED'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[200px]">
                              {d.message}
                            </p>
                            <p className="text-[9px] text-gray-400 mt-0.5">{formatNGT(d.createdAt)}</p>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Expanded body */}
                        {isExpanded && (
                          <div className={`px-4 pb-4 pt-3 border-t ${isOpen ? 'border-amber-200/60 bg-amber-50/20' : 'border-[#E0E7E0] bg-white'}`}>
                            <DisputeChat
                              disputeId={d.id}
                              currentUserId={userProfile.uid}
                              currentUserEmail={userProfile.email}
                              currentUserRole="user"
                              isOpen={isOpen}
                              currentUserDisplayName={userProfile.kycData?.fullName?.trim().split(/\s+/).slice(0, 2).join(' ') || undefined}
                              initialMessage={d.message}
                              initialMessageAt={d.createdAt}
                              initialMessageEmail={userProfile.email}
                              initialMessageDisplayName={userProfile.kycData?.fullName?.trim().split(/\s+/).slice(0, 2).join(' ') || undefined}
                              evidenceUrls={d.imageUrls}
                              adminResponse={d.adminResponse}
                              resolvedAt={d.resolvedAt}
                              onEvidenceClick={(url) => setLightboxUrl(url)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Load more disputes button */}
                  {hasMoreDisputes && onLoadMoreDisputes && (
                    <button
                      onClick={onLoadMoreDisputes}
                      className="w-full py-3 text-xs font-bold text-[#008751] border border-[#008751]/30 rounded-xl hover:bg-[#F0F7F2] transition cursor-pointer uppercase tracking-wide"
                    >
                      Load More Disputes
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          </motion.div>
          </AnimatePresence>
          </div>

        </div>

        {/* Right column (Notice board & Guidelines) */}
        <motion.div
          className="lg:col-span-4 space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
        >
          
          {/* System Bulletin — desktop/large screen only; mobile uses the bell drawer */}
          <div className="hidden lg:block bg-white rounded-3xl border border-[#E0E7E0] shadow-sm p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 text-[#1A1A1A] border-b border-[#E0E7E0] pb-3">
              <div className="relative shrink-0">
                <Bell className="w-4 h-4 text-[#008751]" />
                {(localNotifs.length + privateAnnouncements.length) > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                )}
              </div>
              <h4 className="font-bold text-xs uppercase tracking-wider">Notifications</h4>
              {(localNotifs.length + privateAnnouncements.length) > 0 && (
                <span className="ml-auto shrink-0 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {localNotifs.length + privateAnnouncements.length}
                </span>
              )}
            </div>

            {localNotifs.length === 0 && privateAnnouncements.length === 0 ? (
              <p className="text-xs text-gray-400">No notifications or platform bulletins right now.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">

                {/* ── Activity notifications (real-time) ── */}
                {localNotifs.length > 0 && (
                  <>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Activity</span>
                      <button
                        onClick={() => setLocalNotifs([])}
                        className="text-[9px] text-gray-400 hover:text-rose-500 font-bold transition cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                    {localNotifs.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-medium leading-relaxed ${
                          n.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : n.type === 'error'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}
                      >
                        <span className="flex-1">{n.message}</span>
                        <button
                          onClick={() => setLocalNotifs((prev) => prev.filter((x) => x.id !== n.id))}
                          className="shrink-0 opacity-40 hover:opacity-100 cursor-pointer transition mt-px"
                          aria-label="Dismiss"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </>
                )}

                {/* Divider between sections when both present */}
                {localNotifs.length > 0 && privateAnnouncements.length > 0 && (
                  <div className="pt-1 pb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Platform Bulletins</span>
                  </div>
                )}

                {/* ── Admin-sent announcements ── */}
                {privateAnnouncements.map((ann) => {
                  const isExpanded = expandedAnnIds.includes(ann.id);
                  return (
                    <div key={ann.id} className="bg-[#F7F9F7] rounded-2xl border border-[#E0E7E0] overflow-hidden">
                      {/* Row: div instead of button to avoid nested-button invalid HTML */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleAnn(ann.id)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleAnn(ann.id)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer hover:bg-[#F0F5F1] transition select-none"
                      >
                        <ChevronRight className={`w-3 h-3 text-[#008751] shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        <h5 className="font-bold text-[#1A1A1A] text-xs flex-1 leading-snug">{ann.title}</h5>
                        <span className="text-[9px] text-gray-400 font-mono shrink-0">{formatNGTDate(ann.createdAt)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissAnnouncement(ann.id); }}
                          title="Dismiss permanently"
                          className="shrink-0 text-gray-300 hover:text-rose-400 transition cursor-pointer ml-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3 border-t border-[#E8EFE8]">
                          <p className="text-[11px] text-gray-600 leading-relaxed pt-2">{ann.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick instructions / guidelines card */}
          <div className="bg-white rounded-3xl border border-[#E0E7E0] shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#1A1A1A] border-b border-[#E0E7E0] pb-3">
              <AlertCircle className="w-4 h-4 text-[#008751]" />
              <h4 className="font-bold text-xs uppercase tracking-wider">Rules of the Escrow</h4>
            </div>
            
            <ul className="text-xs text-gray-500 space-y-3 list-none pl-0 leading-relaxed">
              <li className="flex gap-2 items-start">
                <span className="text-[#008751] font-bold mt-0.5">•</span>
                <div>
                  <strong className="text-[#1A1A1A]">Matching Names</strong>: Your receiving bank account name or paying bank account name must match your legal KYC documents exactly. Third party accounts trigger audits.
                </div>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-[#008751] font-bold mt-0.5">•</span>
                <div>
                  <strong className="text-[#1A1A1A]">Network Accuracy</strong>: Always double-check blockchain networks. For instance, depositing BEP20 USDT to a TRC20 address will lead to irreversible asset loss.
                </div>
              </li>
              <li className="flex gap-2 items-start">
                <span className="text-[#008751] font-bold mt-0.5">•</span>
                <div>
                  <strong className="text-[#1A1A1A]">Verification Proof</strong>: Screenshots must show standard banking reference codes, timestamps, and beneficiary names clearly. Blurred sheets will be declined.
                </div>
              </li>
            </ul>
          </div>

        </motion.div>

      </div>

      {/* DETAIL RECEIPT MODAL */}
      <AnimatePresence>
        {viewReceipt && (
          <div className="fixed inset-0 bg-[#1A1A1A]/50 z-50 flex items-start md:items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-[#E0E7E0] overflow-hidden text-[#1A1A1A] flex flex-col my-2 sm:my-4 max-h-[96vh]"
            >
              {/* Receipt Header styling like paper slip */}
              <div className="bg-[#1A1A1A] text-white p-6 text-center space-y-1 relative shrink-0">
                <span className="text-[10px] bg-[#E6F4EA]/10 border border-[#E6F4EA]/20 text-[#00FF85] font-mono px-2.5 py-1 rounded-full uppercase tracking-widest font-bold">
                  9IJA ESCROW LEDGER
                </span>
                <h3 className="text-xl font-bold tracking-tight">Escrow Digital Receipt</h3>
                <p className="text-xs text-gray-400">ID: {viewReceipt.id.toUpperCase()}</p>
                <button
                  onClick={() => setViewReceipt(null)}
                  className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer transition duration-150"
                >
                  <span className="text-lg font-bold">×</span>
                </button>
              </div>

              {/* Receipt body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 font-mono uppercase">TOTAL TRANSACTION PAYOUT</span>
                  <div className="text-3xl font-bold text-[#1A1A1A] mt-1">
                    {viewReceipt.type === 'buy'
                      ? `${viewReceipt.cryptoAmount} ${viewReceipt.token}`
                      : `₦${viewReceipt.ngnAmount.toLocaleString()}`}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono uppercase block mt-1">
                    Via {viewReceipt.network} network at rate ₦{viewReceipt.rate.toLocaleString()}/{viewReceipt.token}
                  </span>
                </div>

                {/* Order summary with fee breakdown and totals */}
                <div className="border-t border-dashed border-[#E0E7E0] pt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono">ORDER TYPE:</span>
                    <span className="font-bold text-[#1A1A1A] uppercase">{viewReceipt.type === 'buy' ? viewReceipt.token === "USDT" ? `Buy USDT` : `Buy ${viewReceipt.token}/USDT` : viewReceipt.token === "USDT" ? `Sell USDT` : `Sell ${viewReceipt.token}/USDT`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono">AMOUNT:</span>
                    <span className="font-bold text-[#1A1A1A]">{viewReceipt.cryptoAmount} {viewReceipt.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono">RATE:</span>
                    <span className="font-bold text-[#1A1A1A]">₦{viewReceipt.rate.toLocaleString()}/{viewReceipt.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono">{viewReceipt.type === 'buy' ? 'YOU PAY (NGN):' : 'YOU RECEIVE (NGN):'}</span>
                    <span className="font-bold text-[#1A1A1A]">₦{viewReceipt.ngnAmount.toLocaleString()}</span>
                  </div>
                  {viewReceipt.token !== 'USDT' && (
                    <div className="flex justify-between text-emerald-700">
                      <span className="text-gray-400 font-mono">USDT EQUIVALENT:</span>
                      <span className="font-bold">
                        {(() => {
                          // Always use the effective USDT rate (market + markup) to convert NGN → USDT.
                          // For live (CoinGecko-pegged) coins this is already correct.
                          // For custom-rate coins the coin's `rate` is NGN-per-token, not NGN-per-USDT,
                          // so dividing ngnAmount by coin.rate would give wrong results.
                          const ngnPerUsdt = viewReceipt.type === 'buy' ? effectiveBuyRate : effectiveSellRate;
                          const usdt = ngnPerUsdt > 0 ? viewReceipt.ngnAmount / ngnPerUsdt : 0;
                          return `≈ ${usdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="border-t border-dashed border-[#E0E7E0] pt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono">ACCOUNT CORRESPONDENT:</span>
                    <span className="font-bold text-[#1A1A1A]">{viewReceipt.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono">SUBMISSION TIME:</span>
                    <span className="font-mono text-gray-600">{formatNGT(viewReceipt.createdAt)}</span>
                  </div>
                  {viewReceipt.processedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-mono">PROCESSED TIME:</span>
                      <span className="font-mono text-gray-600">{formatNGT(viewReceipt.processedAt)}</span>
                    </div>
                  )}
                  
                  {/* Admin Bank Details displayed for buy receipts */}
                  {viewReceipt.adminBankDetails && (
                    <div className="pt-2 border-t border-[#E0E7E0] space-y-1">
                      <span className="text-[9px] text-gray-400 font-mono block">BENEFICIARY BANK ACCOUNT:</span>
                      <div className="bg-[#F7F9F7] border border-[#E0E7E0] p-3 rounded-xl text-[11px] font-mono">
                        <div className="font-bold text-[#1A1A1A]">{viewReceipt.adminBankDetails.bankName}</div>
                        <div className="flex items-center gap-1.5 text-[#1A1A1A]">
                          No: {viewReceipt.adminBankDetails.accountNumber}
                          <button type="button" onClick={() => copyToClipboard(viewReceipt!.adminBankDetails!.accountNumber, 'Account number')} className="p-0.5 rounded text-slate-400 hover:text-[#008751] transition cursor-pointer" title="Copy"><Copy className="w-3 h-3" /></button>
                        </div>
                        <div className="text-gray-500">{viewReceipt.adminBankDetails.accountName}</div>
                      </div>
                    </div>
                  )}

                  {/* User Crypto Receiving Address displayed for buy receipts */}
                  {viewReceipt.type === 'buy' && viewReceipt.userWalletAddress && (
                    <div className="pt-2 border-t border-[#E0E7E0] space-y-1">
                      <span className="text-[9px] text-gray-400 font-mono block">YOUR CRYPTO RECEIVING ADDRESS:</span>
                      <div className="bg-[#F0F7F2] border border-[#D1E6D8] p-3 rounded-xl text-[11px] font-mono">
                        <div className="flex items-start gap-1.5 text-[#1A1A1A]">
                          <span className="break-all flex-1 font-bold">{viewReceipt.userWalletAddress}</span>
                          <button type="button" onClick={() => copyToClipboard(viewReceipt!.userWalletAddress!, 'Wallet address')} className="p-0.5 rounded text-slate-400 hover:text-[#008751] transition cursor-pointer shrink-0 mt-0.5" title="Copy"><Copy className="w-3 h-3" /></button>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">Network: {viewReceipt.network}</div>
                      </div>
                    </div>
                  )}

                  {/* User Bank Details displayed for sell receipts */}
                  {viewReceipt.userBankDetails && (
                    <div className="pt-2 border-t border-[#E0E7E0] space-y-1">
                      <span className="text-[9px] text-gray-400 font-mono block">PAYEE BANK ACCOUNT:</span>
                      <div className="bg-[#F7F9F7] border border-[#E0E7E0] p-3 rounded-xl text-[11px] font-mono">
                        <div className="font-bold text-[#1A1A1A]">{viewReceipt.userBankDetails.bankName}</div>
                        <div className="flex items-center gap-1.5 text-[#1A1A1A]">
                          No: {viewReceipt.userBankDetails.accountNumber}
                          <button type="button" onClick={() => copyToClipboard(viewReceipt!.userBankDetails!.accountNumber, 'Account number')} className="p-0.5 rounded text-slate-400 hover:text-[#008751] transition cursor-pointer" title="Copy"><Copy className="w-3 h-3" /></button>
                        </div>
                        <div className="text-gray-500">{viewReceipt.userBankDetails.accountName}</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E0E7E0]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400 font-mono uppercase text-[9px]">
                        {viewReceipt.status === 'rejected' ? 'ORDER STATUS:' : 'BLOCKCHAIN TRANSACTION ID:'}
                      </span>
                      {viewReceipt.status === 'completed' && (
                        <span className="text-[#008751] font-bold text-[9px] uppercase">COMPLETED</span>
                      )}
                      {viewReceipt.status === 'pending' && (
                        <span className="text-amber-600 font-bold text-[9px] uppercase">PROCESSING...</span>
                      )}
                      {viewReceipt.status === 'rejected' && (
                        <span className="text-red-500 font-bold text-[9px] uppercase">REJECTED</span>
                      )}
                    </div>
                    {viewReceipt.status === 'completed' && viewReceipt.blockchainTxId && (
                      <div className="bg-[#F0F7F2] border border-[#D1E6D8] text-emerald-800 p-2.5 rounded-lg text-[10px] font-mono break-all font-bold">
                        {viewReceipt.blockchainTxId}
                      </div>
                    )}
                    {viewReceipt.status === 'pending' && (
                      <div className="bg-amber-50 text-amber-800 p-2.5 rounded-lg text-[10px] font-mono">
                        Awaiting blockchain mining confirmations & Admin validation.
                      </div>
                    )}
                    {viewReceipt.status === 'rejected' && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-[10px] font-mono space-y-1">
                        <div>This order was rejected by the admin.</div>
                        {viewReceipt.rejectionReason && (
                          <div className="pt-1 border-t border-red-200">
                            <span className="font-bold uppercase text-[9px] text-red-500 block mb-0.5">Admin Reason:</span>
                            {viewReceipt.rejectionReason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispute section — only shown for rejected orders */}
                {viewReceipt.status === 'rejected' && (() => {
                  const orderDisputes = disputes.filter(d => d.orderId === viewReceipt.id);
                  return (
                    <div className="border-t border-[#E0E7E0] pt-4 space-y-4">

                      {/* Past dispute history — collapsible cards, load more if >5 */}
                      {orderDisputes.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-[#008751]" />
                              <span className="text-xs font-bold text-[#1A1A1A]">
                                Dispute History ({orderDisputes.length})
                              </span>
                            </div>
                            {orderDisputes.length > 1 && (
                              <button
                                onClick={() => {
                                  if (expandedDisputeIds.size === orderDisputes.length) {
                                    setExpandedDisputeIds(new Set());
                                  } else {
                                    setExpandedDisputeIds(new Set(orderDisputes.map(d => d.id)));
                                  }
                                }}
                                className="text-[9px] text-[#008751] font-bold uppercase tracking-wide cursor-pointer hover:underline"
                              >
                                {expandedDisputeIds.size === orderDisputes.length ? 'Collapse all' : 'Expand all'}
                              </button>
                            )}
                          </div>
                          {(disputeShowAll ? orderDisputes : orderDisputes.slice(0, 5)).map((d, i) => {
                            const isExpanded = expandedDisputeIds.has(d.id);
                            const toggleExpand = () => setExpandedDisputeIds(prev => {
                              const next = new Set(prev);
                              if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
                              return next;
                            });
                            return (
                              <div key={d.id} className="bg-[#F7F9F7] border border-[#E0E7E0] rounded-xl overflow-hidden text-[11px]">
                                {/* Header — always visible, click to expand */}
                                <button
                                  onClick={toggleExpand}
                                  className="w-full flex items-center justify-between px-3 py-2.5 text-left cursor-pointer hover:bg-[#F0F5F1] transition"
                                >
                                  <span className="text-[9px] text-gray-400 font-mono">
                                    Dispute #{i + 1} · {formatNGT(d.createdAt)}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      d.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>{d.status}</span>
                                    <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                  </div>
                                </button>
                                {/* Collapsible body */}
                                <AnimatePresence initial={false}>
                                  {isExpanded && (
                                    <motion.div
                                      key="body"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-3 pb-3 pt-2 border-t border-[#E0E7E0]">
                                        <DisputeChat
                                          disputeId={d.id}
                                          currentUserId={userProfile.uid}
                                          currentUserEmail={userProfile.email}
                                          currentUserRole="user"
                                          isOpen={d.status === 'open'}
                                          currentUserDisplayName={userProfile.kycData?.fullName?.trim().split(/\s+/).slice(0, 2).join(' ') || undefined}
                                          initialMessage={d.message}
                                          initialMessageAt={d.createdAt}
                                          initialMessageEmail={userProfile.email}
                                          initialMessageDisplayName={userProfile.kycData?.fullName?.trim().split(/\s+/).slice(0, 2).join(' ') || undefined}
                                          evidenceUrls={d.imageUrls}
                                          adminResponse={d.adminResponse}
                                          resolvedAt={d.resolvedAt}
                                          onEvidenceClick={(url) => setLightboxUrl(url)}
                                        />
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                          {/* Load more button */}
                          {orderDisputes.length > 5 && !disputeShowAll && (
                            <button
                              onClick={() => setDisputeShowAll(true)}
                              className="w-full py-2 text-[10px] font-bold text-[#008751] border border-[#008751]/30 rounded-xl hover:bg-[#F0F7F2] transition cursor-pointer uppercase tracking-wide"
                            >
                              Load {orderDisputes.length - 5} more dispute{orderDisputes.length - 5 > 1 ? 's' : ''}
                            </button>
                          )}
                          {disputeShowAll && orderDisputes.length > 5 && (
                            <button
                              onClick={() => setDisputeShowAll(false)}
                              className="w-full py-2 text-[10px] font-bold text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer uppercase tracking-wide"
                            >
                              Show fewer
                            </button>
                          )}
                        </div>
                      )}

                      {/* Submit new dispute */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#008751]" />
                          <span className="text-xs font-bold text-[#1A1A1A]">
                            {orderDisputes.length > 0 ? 'Submit Another Dispute' : 'Submit a Dispute'}
                          </span>
                        </div>
                        {disputeSubmitted === viewReceipt.id ? (
                          <div className="bg-[#F0F7F2] border border-[#D1E6D8] text-emerald-800 p-3 rounded-xl text-[11px] font-mono text-center">
                            ✅ Dispute submitted. The admin will review and respond.
                          </div>
                        ) : (
                          <>
                            <textarea
                              rows={3}
                              value={disputeMessage}
                              onChange={(e) => setDisputeMessage(e.target.value)}
                              maxLength={1000}
                              placeholder="Describe your challenge — include your reference number, transaction details, or any relevant info…"
                              className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl text-[11px] text-[#1A1A1A] resize-none focus:outline-none focus:ring-1 focus:ring-[#008751]"
                            />
                            <p className="text-[9px] text-slate-400 font-mono text-right -mt-1">{disputeMessage.length}/1 000</p>

                            {/* Multi-image upload — up to 3 */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-gray-500 font-mono uppercase block">
                                Attach Payment Proof ({disputeImageUrls.length}/3 images)
                              </label>
                              <div className="flex gap-2 flex-wrap">
                                {disputeImageUrls.map((url, i) => (
                                  <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden border border-[#D1E6D8]">
                                    <img src={url} alt={`proof ${i + 1}`} className="w-full h-full object-cover" />
                                    <button
                                      onClick={() => setDisputeImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                                      className="absolute top-0.5 right-0.5 bg-white/90 hover:bg-white text-red-600 rounded-full p-0.5 cursor-pointer"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                                {disputeImageUrls.length < 3 && (
                                  <label className="w-20 h-16 flex flex-col items-center justify-center border border-dashed border-[#D1E6D8] rounded-lg cursor-pointer hover:bg-[#F7FBF8] transition gap-1">
                                    <Upload className="w-3.5 h-3.5 text-[#008751]" />
                                    <span className="text-[9px] text-gray-400">Add</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = async (ev) => {
                                          try {
                                            const compressed = await compressImage(ev.target?.result as string, 250);
                                            setDisputeImageUrls(prev => [...prev, compressed]);
                                          } catch { addToast('Failed to process image.', 'error'); }
                                        };
                                        reader.readAsDataURL(file);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                if (!disputeMessage.trim()) { addToast('Please enter a dispute message.', 'error'); return; }
                                if (disputeMessage.trim().length > 1000) { addToast('Dispute message must be under 1 000 characters.', 'error'); return; }
                                setIsSubmittingDispute(true);
                                try {
                                  await submitDispute(viewReceipt.id, userProfile.uid, userProfile.email, disputeMessage.trim(), disputeImageUrls.length > 0 ? disputeImageUrls : undefined);
                                  setDisputeSubmitted(viewReceipt.id);
                                  setDisputeMessage('');
                                  setDisputeImageUrls([]);
                                  addToast('Dispute submitted to admin panel.', 'success');
                                } catch (err: any) {
                                  addToast('Failed to submit dispute: ' + err.message, 'error');
                                } finally {
                                  setIsSubmittingDispute(false);
                                }
                              }}
                              disabled={isSubmittingDispute}
                              className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60"
                            >
                              {isSubmittingDispute ? 'Submitting…' : 'Submit Dispute'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-2">
                  <button
                    onClick={() => { setViewReceipt(null); setDisputeMessage(''); setDisputeImageUrls([]); setDisputeSubmitted(null); }}
                    className="w-full bg-[#008751] hover:bg-[#007043] text-white py-3 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Close Receipt
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Mobile Bulletin Drawer (lg:hidden) ──────────────────────────────── */}
      <AnimatePresence>
        {mobileBulletinOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 lg:hidden"
              onClick={onCloseMobileBulletin}
            />
            {/* Sheet slides up from bottom */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-3xl border-t border-[#E0E7E0] shadow-2xl flex flex-col max-h-[80vh]"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-[#E0E7E0] shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#008751]" />
                  <h4 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">Notification</h4>
                  {(localNotifs.length + privateAnnouncements.length) > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {localNotifs.length + privateAnnouncements.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={onCloseMobileBulletin}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet body — scrollable */}
              <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-2">
                {localNotifs.length === 0 && privateAnnouncements.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No notifications right now.</p>
                ) : (
                  <>
                    {localNotifs.length > 0 && (
                      <>
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Activity</span>
                          <button
                            onClick={() => setLocalNotifs([])}
                            className="text-[9px] text-gray-400 hover:text-rose-500 font-bold transition cursor-pointer"
                          >
                            Clear all
                          </button>
                        </div>
                        {localNotifs.map((n) => (
                          <div
                            key={n.id}
                            className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-medium leading-relaxed ${
                              n.type === 'success'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : n.type === 'error'
                                ? 'bg-red-50 border-red-200 text-red-900'
                                : 'bg-blue-50 border-blue-200 text-blue-900'
                            }`}
                          >
                            <span className="flex-1">{n.message}</span>
                            <button
                              onClick={() => setLocalNotifs((prev) => prev.filter((x) => x.id !== n.id))}
                              className="shrink-0 opacity-40 hover:opacity-100 cursor-pointer transition mt-px"
                              aria-label="Dismiss"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </>
                    )}

                    {localNotifs.length > 0 && privateAnnouncements.length > 0 && (
                      <div className="pt-2 pb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Platform Bulletins</span>
                      </div>
                    )}

                    {privateAnnouncements.map((ann) => {
                      const isExpanded = expandedAnnIds.includes(ann.id);
                      return (
                        <div key={ann.id} className="bg-[#F7F9F7] rounded-2xl border border-[#E0E7E0] overflow-hidden">
                          {/* Row: div instead of button to avoid nested-button invalid HTML */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleAnn(ann.id)}
                            onKeyDown={(e) => e.key === 'Enter' && toggleAnn(ann.id)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer hover:bg-[#F0F5F1] transition select-none"
                          >
                            <ChevronRight className={`w-3 h-3 text-[#008751] shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            <h5 className="font-bold text-[#1A1A1A] text-xs flex-1 leading-snug">{ann.title}</h5>
                            <span className="text-[9px] text-gray-400 font-mono shrink-0">{formatNGTDate(ann.createdAt)}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissAnnouncement(ann.id); }}
                              title="Dismiss"
                              className="shrink-0 text-gray-300 hover:text-rose-400 transition cursor-pointer ml-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-3 border-t border-[#E8EFE8]">
                              <p className="text-[11px] text-gray-600 leading-relaxed pt-2">{ann.content}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image lightbox overlay */}
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

import React, { useState } from 'react';
import { Order, AdminSettings, CoinListing, UserProfile } from '../../types';
import { createOrder } from '../../lib/dbHelpers';
import { TrendingUp, Send, AlertCircle as AlertCircle2, Loader as Loader2 } from 'lucide-react';

interface TradeTabProps {
  userProfile: UserProfile;
  coins: CoinListing[];
  settings: AdminSettings;
  liveNgnRate: number | null;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOrderCreated: () => void;
}

export default function TradeTab({
  userProfile,
  coins,
  settings,
  liveNgnRate,
  addToast,
  onOrderCreated
}: TradeTabProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [network, setNetwork] = useState<'BSC' | 'Tron' | 'Polygon'>('BSC');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      addToast('Screenshot selected', 'success');
    }
  };

  const handleSubmitTrade = async () => {
    if (!screenshot || !cryptoAmount) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const rate = liveNgnRate || settings.usdtSellMarkup;
      const amount = parseFloat(cryptoAmount);

      // In production, upload screenshot to storage
      const screenshotUrl = 'https://via.placeholder.com/screenshot';

      await createOrder(
        userProfile.uid,
        userProfile.email,
        tradeType,
        amount,
        rate,
        network,
        screenshotUrl
      );

      addToast('Order created successfully! Admin will review it soon.', 'success');
      setCryptoAmount('');
      setScreenshot(null);
      onOrderCreated();
    } catch (err) {
      addToast('Failed to create order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedNGN = cryptoAmount ? (parseFloat(cryptoAmount) * (liveNgnRate || settings.usdtSellMarkup)).toLocaleString('en-NG') : '0';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E0E7E0] p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-[#008751]" />
          <h3 className="text-lg font-bold text-[#1A1A1A]">Start a Trade</h3>
        </div>

        {userProfile.kycStatus !== 'approved' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2 text-xs text-amber-800">
            <AlertCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Complete KYC verification to trade. Go to the KYC tab to get started.</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Trade Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
              I want to
            </label>
            <div className="flex gap-2">
              {(['buy', 'sell'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTradeType(type)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition ${
                    tradeType === type
                      ? 'bg-[#008751] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'buy' ? '💰 Buy USDT' : '📤 Sell USDT'}
                </button>
              ))}
            </div>
          </div>

          {/* Network Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
              Network
            </label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as any)}
              className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
            >
              <option value="BSC">BSC (BEP20)</option>
              <option value="Tron">Tron (TRC20)</option>
              <option value="Polygon">Polygon</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
              USDT Amount
            </label>
            <input
              type="number"
              value={cryptoAmount}
              onChange={(e) => setCryptoAmount(e.target.value)}
              placeholder="Enter amount..."
              className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Estimated NGN: ₦{calculatedNGN}
            </p>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
              Payment Proof
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none text-sm"
            />
            {screenshot && (
              <p className="text-xs text-green-600 mt-1">✓ {screenshot.name}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmitTrade}
          disabled={isSubmitting || userProfile.kycStatus !== 'approved'}
          className="w-full mt-6 py-3 px-3 rounded-xl bg-[#008751] hover:bg-[#007043] text-white text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Order...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Create Trade Order
            </>
          )}
        </button>
      </div>
    </div>
  );
}

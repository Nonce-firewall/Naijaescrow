import React, { useState } from 'react';
import { CoinListing } from '../../types';
import { Coins, Plus, Check, Eye, EyeOff, Trash2 } from 'lucide-react';
import { toggleCoinPublish, deleteCoinListing } from '../../lib/dbHelpers';

export interface CoinsTabProps {
  coins: CoinListing[];
  onRefresh?: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onTogglePublish?: (id: string, published: boolean) => void;
  onDeleteCoin?: (id: string) => void;
}

export default function CoinsTab({
  coins,
  onRefresh,
  addToast,
  onTogglePublish,
  onDeleteCoin,
}: CoinsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCoins = coins.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.network.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = async (coin: CoinListing) => {
    try {
      if (onTogglePublish) {
        onTogglePublish(coin.id, !coin.published);
      } else {
        await toggleCoinPublish(coin.id, !coin.published);
      }
      addToast(`${coin.name} visibility updated.`, 'success');
      onRefresh?.();
    } catch {
      addToast('Failed to update coin visibility', 'error');
    }
  };

  const handleDelete = async (coin: CoinListing) => {
    if (!window.confirm?.(`Are you sure you want to unpublish/delete ${coin.name}?`)) {
      return;
    }
    try {
      if (onDeleteCoin) {
        onDeleteCoin(coin.id);
      } else {
        await deleteCoinListing(coin.id);
      }
      addToast(`${coin.name} removed from listings.`, 'success');
      onRefresh?.();
    } catch {
      addToast('Failed to remove coin', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E0E7E0]">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#008751]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]">Coin & Token Listings</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure published cryptocurrencies, transaction fees, and custom wallet addresses.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search coins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751] w-full sm:w-48"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCoins.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
            No coin listings found matching your search.
          </div>
        ) : (
          filteredCoins.map((coin) => (
            <div
              key={coin.id}
              className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-shadow hover:shadow-sm ${
                coin.published !== false
                  ? 'border-[#E0E7E0]'
                  : 'border-gray-200 opacity-60 bg-gray-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {coin.logoUrl ? (
                      <img
                        src={coin.logoUrl}
                        alt={coin.symbol}
                        className="w-8 h-8 rounded-full object-contain bg-gray-50 border border-gray-200 p-0.5"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#E8F5E9] text-[#008751] font-bold text-xs flex items-center justify-center">
                        {coin.symbol.slice(0, 3)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-[#1A1A1A]">{coin.name}</h4>
                      <span className="text-[11px] font-mono text-gray-500 uppercase">
                        {coin.symbol} • {coin.network}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      coin.published !== false
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {coin.published !== false ? 'Active' : 'Hidden'}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 font-mono mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rate:</span>
                    <span className="font-bold text-gray-800">₦{coin.rate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fee %:</span>
                    <span className="font-bold text-gray-800">{coin.feePercentage ?? 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Min Trade:</span>
                    <span className="font-bold text-gray-800">
                      {coin.minTradeAmount ?? 1} {coin.symbol}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-gray-200/60 truncate">
                    <span className="text-gray-400 block text-[10px]">Deposit Wallet:</span>
                    <span className="text-[11px] text-gray-700 break-all">
                      {coin.walletAddress}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => handleToggle(coin)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-700 transition"
                  title={coin.published !== false ? 'Hide from public' : 'Publish to public'}
                >
                  {coin.published !== false ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Publish
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(coin)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

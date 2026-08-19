import React, { useState } from 'react';
import { Order, AdminSettings } from '../../types';
import { formatNGT, formatNGTDate } from '../../lib/dateUtils';
import { processOrder } from '../../lib/dbHelpers';
import { CheckCircle as CheckCircle2, Circle as XCircle, TrendingUp, ChevronRight } from 'lucide-react';

interface OrdersTabProps {
  orders: Order[];
  settings: AdminSettings;
  selectedOrder: Order | null;
  blockchainTxId: string;
  orderRejectionReason: string;
  isProcessingOrder: boolean;
  onSelectOrder: (order: Order) => void;
  onUpdateBlockchainTx: (txId: string) => void;
  onUpdateRejectionReason: (reason: string) => void;
  onApproveOrder: (orderId: string) => void;
  onRejectOrder: (orderId: string) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function OrdersTab({
  orders,
  settings,
  selectedOrder,
  blockchainTxId,
  orderRejectionReason,
  isProcessingOrder,
  onSelectOrder,
  onUpdateBlockchainTx,
  onUpdateRejectionReason,
  onApproveOrder,
  onRejectOrder,
  addToast
}: OrdersTabProps) {
  const pendingOrders = orders.filter(o => o.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Orders Queue */}
      <div className="bg-white rounded-2xl border border-[#E0E7E0] p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#008751]" />
          <h3 className="text-lg font-bold text-[#1A1A1A]">Pending Orders ({pendingOrders.length})</h3>
        </div>

        {pendingOrders.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No pending orders</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className={`w-full p-3 rounded-xl text-left border transition flex items-center justify-between ${
                  selectedOrder?.id === order.id
                    ? 'bg-[#E6F4EA] border-[#008751]'
                    : 'bg-gray-50 border-[#E0E7E0] hover:bg-[#F7F9F7]'
                }`}
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm text-[#1A1A1A]">
                    {order.type === 'buy' ? 'BUY' : 'SELL'} {order.cryptoAmount} USDT
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNGT(order.ngnAmount)} • {formatNGTDate(order.createdAt)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Order Details & Action Panel */}
      {selectedOrder && (
        <div className="bg-white rounded-2xl border border-[#E0E7E0] p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Order Details</h3>

          <div className="space-y-3 mb-6 pb-6 border-b border-[#E0E7E0]">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Type:</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">
                {selectedOrder.type === 'buy' ? '💰 Buy' : '📤 Sell'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Amount:</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{selectedOrder.cryptoAmount} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">NGN Amount:</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{formatNGT(selectedOrder.ngnAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">User:</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{selectedOrder.userEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Network:</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{selectedOrder.network}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
                Blockchain TX ID (if approved)
              </label>
              <input
                type="text"
                value={blockchainTxId}
                onChange={(e) => onUpdateBlockchainTx(e.target.value)}
                placeholder="Enter transaction ID..."
                className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
                Rejection Reason (if rejecting)
              </label>
              <textarea
                value={orderRejectionReason}
                onChange={(e) => onUpdateRejectionReason(e.target.value)}
                placeholder="Explain why this order is being rejected..."
                className="w-full px-3 py-2 border border-[#E0E7E0] rounded-xl bg-[#F7F9F7] focus:outline-none focus:ring-2 focus:ring-[#008751] text-sm"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onApproveOrder(selectedOrder.id)}
                disabled={isProcessingOrder}
                className="flex-1 py-2 px-3 rounded-xl bg-[#008751] hover:bg-[#007043] text-white text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => onRejectOrder(selectedOrder.id)}
                disabled={isProcessingOrder}
                className="flex-1 py-2 px-3 rounded-xl border border-red-300 hover:bg-red-50 text-red-600 text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

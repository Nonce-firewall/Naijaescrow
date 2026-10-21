import React, { useState } from 'react';
import { Order } from '../../types';
import { Clock, CheckCircle, XCircle, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';
import { formatNGTDate } from '../../lib/dateUtils';

export interface OrdersTabProps {
  orders: Order[];
  onSelectOrder?: (order: Order) => void;
  onOpenDispute?: (order: Order) => void;
}

export default function OrdersTab({ orders, onSelectOrder, onOpenDispute }: OrdersTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredOrders = orders.filter((o) => {
    const matchesType = filterType === 'all' || o.type === filterType;
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesType && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-[#E0E7E0]">
        <div>
          <h3 className="font-bold text-sm text-[#1A1A1A]">My Transaction History</h3>
          <p className="text-xs text-gray-500">
            Track the real-time status of your NGN/USDT escrow trades.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
          >
            <option value="all">All Types</option>
            <option value="buy">Buys</option>
            <option value="sell">Sells</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Declined</option>
          </select>
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 text-xs">
            No escrow transactions found matching filter.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-4 rounded-2xl border border-[#E0E7E0] hover:border-[#008751]/40 transition shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    order.type === 'buy'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {order.type === 'buy' ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1A1A1A]">
                      {order.type === 'buy' ? 'Bought' : 'Sold'} {order.cryptoAmount} {order.token}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        order.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : order.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">
                    ₦{order.ngnAmount.toLocaleString()} @ ₦{order.rate.toLocaleString()} •{' '}
                    {order.network}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {formatNGTDate(order.createdAt)} • Ref: {order.id.substring(0, 8)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {order.status === 'pending' && onOpenDispute && (
                  <button
                    type="button"
                    onClick={() => onOpenDispute(order)}
                    className="px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl font-semibold transition"
                  >
                    Open Dispute
                  </button>
                )}
                {onSelectOrder && (
                  <button
                    type="button"
                    onClick={() => onSelectOrder(order)}
                    className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition"
                  >
                    Details
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

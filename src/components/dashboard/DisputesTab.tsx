import React, { useState } from 'react';
import { Dispute, Order } from '../../types';
import { ShieldAlert, Plus, CheckCircle, Clock, Send } from 'lucide-react';
import { submitDispute } from '../../lib/dbHelpers';

export interface DisputesTabProps {
  disputes: Dispute[];
  orders: Order[];
  userEmail: string;
  userId: string;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh?: () => void;
  onSubmitDispute?: (orderId: string, message: string) => Promise<void>;
}

export default function DisputesTab({
  disputes,
  orders,
  userEmail,
  userId,
  addToast,
  onRefresh,
  onSubmitDispute,
}: DisputesTabProps) {
  const [isOpeningNew, setIsOpeningNew] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [disputeMessage, setDisputeMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Orders eligible for dispute (e.g. pending or recent)
  const eligibleOrders = orders.filter((o) => o.status !== 'rejected');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      addToast('Please select the transaction you want to dispute.', 'error');
      return;
    }
    if (!disputeMessage.trim()) {
      addToast('Please describe the issue with this transaction.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmitDispute) {
        await onSubmitDispute(selectedOrderId, disputeMessage.trim());
      } else {
        await submitDispute(selectedOrderId, userId, userEmail, disputeMessage.trim());
      }
      addToast('Dispute opened successfully. An administrator has been notified.', 'success');
      setSelectedOrderId('');
      setDisputeMessage('');
      setIsOpeningNew(false);
      onRefresh?.();
    } catch {
      addToast('Failed to submit dispute.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#E0E7E0]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-[#1A1A1A]">Dispute Resolution</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Need help with an order? Open an official dispute and get support from our escrow mediation team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpeningNew(!isOpeningNew)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition"
        >
          <Plus className="w-4 h-4" />
          {isOpeningNew ? 'Cancel' : 'New Dispute'}
        </button>
      </div>

      {isOpeningNew && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-amber-300 shadow-sm space-y-4">
          <h4 className="font-bold text-sm text-[#1A1A1A]">File a Transaction Dispute</h4>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Transaction</label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            >
              <option value="">-- Choose Order to Dispute --</option>
              {eligibleOrders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  #{ord.id.substring(0, 8)}: {ord.type.toUpperCase()} {ord.cryptoAmount} {ord.token} (₦{ord.ngnAmount.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Explain the Issue</label>
            <textarea
              rows={3}
              value={disputeMessage}
              onChange={(e) => setDisputeMessage(e.target.value)}
              placeholder="State what went wrong (e.g., payment sent from bank app but funds not credited)..."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpeningNew(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Opening...' : 'Submit Dispute'}
            </button>
          </div>
        </form>
      )}

      {/* Disputes history */}
      <div className="space-y-3">
        {disputes.length === 0 ? (
          <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 text-xs">
            You currently have no active or historical disputes.
          </div>
        ) : (
          disputes.map((disp) => (
            <div
              key={disp.id}
              className={`bg-white p-5 rounded-2xl border transition ${
                disp.status === 'open' ? 'border-amber-300 bg-amber-50/20' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-900">Order Ref: #{disp.orderId.substring(0, 8)}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 uppercase ${
                    disp.status === 'open'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {disp.status === 'open' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                  {disp.status}
                </span>
              </div>
              <p className="text-xs text-gray-700 bg-gray-50 rounded-xl p-3 border border-gray-100 whitespace-pre-wrap">
                {disp.message}
              </p>
              {disp.adminResponse && (
                <div className="mt-3 text-xs text-emerald-900 bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <span className="font-bold block text-[11px] text-emerald-800 mb-0.5">Admin Response:</span>
                  {disp.adminResponse}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

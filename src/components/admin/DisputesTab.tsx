import React, { useState } from 'react';
import { Dispute } from '../../types';
import { ShieldAlert, CheckCircle, Clock, MessageSquare, Send } from 'lucide-react';
import { resolveDispute } from '../../lib/dbHelpers';

export interface DisputesTabProps {
  disputes: Dispute[];
  hasMoreDisputes?: boolean;
  onLoadMoreDisputes?: () => void;
  onRefresh?: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSelectDispute?: (dispute: Dispute) => void;
}

export default function DisputesTab({
  disputes,
  hasMoreDisputes = false,
  onLoadMoreDisputes,
  onRefresh,
  addToast,
  onSelectDispute,
}: DisputesTabProps) {
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');

  const filteredDisputes = disputes.filter((d) =>
    filterStatus === 'all' ? true : d.status === filterStatus
  );

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;
    if (!adminResponse.trim()) {
      addToast('Please enter an admin resolution statement.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await resolveDispute(selectedDispute.id, adminResponse.trim());
      addToast('Dispute resolved successfully.', 'success');
      setAdminResponse('');
      setSelectedDispute(null);
      onRefresh?.();
    } catch {
      addToast('Failed to resolve dispute.', 'error');
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
            <h3 className="text-lg font-bold text-[#1A1A1A]">Dispute Resolution Center</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review trader claims, inspect transaction evidence, and record official resolutions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
          >
            <option value="all">All Disputes ({disputes.length})</option>
            <option value="open">Open Only</option>
            <option value="resolved">Resolved Only</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDisputes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
            No disputes found matching filter.
          </div>
        ) : (
          filteredDisputes.map((disp) => (
            <div
              key={disp.id}
              className={`bg-white p-5 rounded-2xl border transition ${
                disp.status === 'open' ? 'border-amber-300 bg-amber-50/20' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 uppercase ${
                    disp.status === 'open'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {disp.status === 'open' ? (
                    <Clock className="w-3 h-3" />
                  ) : (
                    <CheckCircle className="w-3 h-3" />
                  )}
                  {disp.status}
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  Order #{disp.orderId.substring(0, 8)}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                <div className="font-semibold text-xs text-gray-900">{disp.userEmail}</div>
                <p className="text-xs text-gray-700 bg-gray-50 rounded-xl p-3 border border-gray-100 whitespace-pre-wrap">
                  {disp.message}
                </p>
                {disp.adminResponse && (
                  <div className="mt-2 text-xs text-emerald-900 bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                    <span className="font-bold block text-[11px] text-emerald-800 mb-0.5">
                      Admin Resolution:
                    </span>
                    {disp.adminResponse}
                  </div>
                )}
              </div>

              {disp.status === 'open' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDispute(disp);
                    onSelectDispute?.(disp);
                  }}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Resolve Dispute
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {hasMoreDisputes && onLoadMoreDisputes && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onLoadMoreDisputes}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 rounded-xl transition"
          >
            Load Older Disputes
          </button>
        </div>
      )}

      {selectedDispute && (
        <form
          onSubmit={handleResolve}
          className="bg-white p-6 rounded-2xl border border-amber-300 shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="font-bold text-sm text-[#1A1A1A]">
              Resolve Dispute for Order #{selectedDispute.orderId}
            </h4>
            <button
              type="button"
              onClick={() => setSelectedDispute(null)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Admin Findings & Resolution Summary
            </label>
            <textarea
              rows={3}
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              placeholder="e.g., Bank transfer confirmed with sender's reference. Order approved."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedDispute(null)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

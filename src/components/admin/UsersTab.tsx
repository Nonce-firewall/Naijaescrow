import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { Users, Shield, ShieldAlert, CheckCircle, XCircle, Search, UserCheck } from 'lucide-react';
import {
  suspendUser,
  terminateUser,
  reinstateUser,
  reactivatePendingUser,
} from '../../lib/dbHelpers';

export interface UsersTabProps {
  users: UserProfile[];
  onRefresh?: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSelectUser?: (user: UserProfile) => void;
}

export default function UsersTab({ users, onRefresh, addToast, onSelectUser }: UsersTabProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.uid.toLowerCase().includes(search.toLowerCase()) ||
      (u.kycData?.fullName && u.kycData.fullName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending_kyc'
          ? u.kycStatus === 'pending'
          : u.accountStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleSuspend = async (uid: string) => {
    if (!actionReason.trim()) {
      addToast('Please enter a suspension reason.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await suspendUser(uid, actionReason.trim());
      addToast('User has been suspended.', 'success');
      setActionReason('');
      setSelectedUser(null);
      onRefresh?.();
    } catch {
      addToast('Failed to suspend user.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTerminate = async (uid: string) => {
    if (!actionReason.trim()) {
      addToast('Please enter a termination reason.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await terminateUser(uid, actionReason.trim());
      addToast('User has been permanently terminated.', 'success');
      setActionReason('');
      setSelectedUser(null);
      onRefresh?.();
    } catch {
      addToast('Failed to terminate user.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReinstate = async (uid: string) => {
    setIsProcessing(true);
    try {
      await reinstateUser(uid);
      addToast('User status reinstated to active.', 'success');
      setSelectedUser(null);
      onRefresh?.();
    } catch {
      addToast('Failed to reinstate user.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async (uid: string) => {
    setIsProcessing(true);
    try {
      await reactivatePendingUser(uid);
      addToast('Reactivation approved for previous user.', 'success');
      setSelectedUser(null);
      onRefresh?.();
    } catch {
      addToast('Failed to reactivate pending user.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E0E7E0]">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#008751]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]">User Directory & Access Control</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage trader accounts, review status, handle sanctions, and oversee account
            reactivation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by email, name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl w-full focus:outline-none focus:border-[#008751]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
            <option value="pending_reactivation">Pending Reactivation</option>
            <option value="pending_kyc">Pending KYC</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E0E7E0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{u.email}</div>
                      <div className="text-[10px] font-mono text-gray-400 truncate max-w-xs">
                        {u.uid}
                      </div>
                      {u.kycData?.fullName && (
                        <div className="text-[11px] text-gray-600 mt-0.5">{u.kycData.fullName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          u.kycStatus === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : u.kycStatus === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : u.kycStatus === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {u.kycStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          u.accountStatus === 'active' || !u.accountStatus
                            ? 'bg-emerald-50 text-emerald-700'
                            : u.accountStatus === 'suspended'
                              ? 'bg-amber-100 text-amber-800'
                              : u.accountStatus === 'terminated'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.accountStatus || 'active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          onSelectUser?.(u);
                        }}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="bg-white p-6 rounded-2xl border border-gray-300 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="font-bold text-sm text-[#1A1A1A]">
              Account Actions for {selectedUser.email}
            </h4>
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Close
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Reason / Admin Notes (Required for suspension or termination)
            </label>
            <input
              type="text"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Provide reason for this action..."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {selectedUser.accountStatus === 'pending_reactivation' && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReactivate(selectedUser.uid)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" /> Approve Reactivation
              </button>
            )}

            {(selectedUser.accountStatus === 'suspended' ||
              selectedUser.accountStatus === 'terminated') && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReinstate(selectedUser.uid)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Reinstate to Active
              </button>
            )}

            {selectedUser.accountStatus !== 'suspended' &&
              selectedUser.accountStatus !== 'terminated' && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSuspend(selectedUser.uid)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  <Shield className="w-3.5 h-3.5" /> Suspend Account
                </button>
              )}

            {selectedUser.accountStatus !== 'terminated' && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleTerminate(selectedUser.uid)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Terminate Account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

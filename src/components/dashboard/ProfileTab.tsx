import React, { useState } from 'react';
import { UserProfile, NotificationPreferences } from '../../types';
import { Bell, KeyRound, Trash2 } from 'lucide-react';
import { updateNotificationPreferences, changePassword, deleteAccount } from '../../lib/dbHelpers';

export interface ProfileTabProps {
  userProfile: UserProfile;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh?: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => Promise<void>;
}

export default function ProfileTab({
  userProfile,
  addToast,
  onRefresh,
  onSignOut,
  onDeleteAccount,
}: ProfileTabProps) {
  const [orderUpdates, setOrderUpdates] = useState(
    userProfile.notificationPreferences?.orderUpdates ?? true
  );
  const [kycUpdates, setKycUpdates] = useState(
    userProfile.notificationPreferences?.kycUpdates ?? true
  );
  const [announcements, setAnnouncements] = useState(
    userProfile.notificationPreferences?.announcements ?? true
  );
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Deletion state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const prefs: NotificationPreferences = {
        orderUpdates,
        kycUpdates,
        announcements,
      };
      await updateNotificationPreferences(userProfile.uid, prefs);
      addToast('Notification preferences saved!', 'success');
      onRefresh?.();
    } catch {
      addToast('Failed to save preferences.', 'error');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      addToast('Password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(newPassword);
      addToast('Password updated successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      addToast('Failed to update password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      if (onDeleteAccount) {
        await onDeleteAccount();
      } else {
        await deleteAccount();
      }
      addToast('Account deletion initiated.', 'info');
      onSignOut?.();
    } catch {
      addToast('Failed to delete account.', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <div className="bg-white p-6 rounded-2xl border border-[#E0E7E0]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#008751]/10 text-[#008751] flex items-center justify-center font-bold text-lg">
            {userProfile.email.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-base text-[#1A1A1A]">{userProfile.email}</h3>
            <span className="text-xs text-gray-500 font-mono">UID: {userProfile.uid}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100 text-xs">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Role</span>
            <span className="font-semibold text-gray-800 capitalize">{userProfile.role}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-bold">KYC Status</span>
            <span className="font-semibold text-gray-800 capitalize">{userProfile.kycStatus}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Account Status</span>
            <span className="font-semibold text-gray-800 capitalize">{userProfile.accountStatus || 'active'}</span>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white p-6 rounded-2xl border border-[#E0E7E0] space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#008751]" />
          <h4 className="font-bold text-sm text-[#1A1A1A]">Notification Preferences</h4>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">Order Updates</div>
              <div className="text-gray-500 text-[11px]">Receive notifications when your order status changes</div>
            </div>
            <input
              type="checkbox"
              checked={orderUpdates}
              onChange={(e) => setOrderUpdates(e.target.checked)}
              className="w-4 h-4 text-[#008751] rounded focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">KYC Status Updates</div>
              <div className="text-gray-500 text-[11px]">Get notified when your verification is approved or reviewed</div>
            </div>
            <input
              type="checkbox"
              checked={kycUpdates}
              onChange={(e) => setKycUpdates(e.target.checked)}
              className="w-4 h-4 text-[#008751] rounded focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
            <div>
              <div className="font-semibold text-gray-900">System Bulletins</div>
              <div className="text-gray-500 text-[11px]">Get alerted to rate changes and maintenance windows</div>
            </div>
            <input
              type="checkbox"
              checked={announcements}
              onChange={(e) => setAnnouncements(e.target.checked)}
              className="w-4 h-4 text-[#008751] rounded focus:ring-0"
            />
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={isSavingPrefs}
            onClick={handleSavePreferences}
            className="px-4 py-2 bg-[#008751] hover:bg-[#007043] text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
          >
            {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-2xl border border-[#E0E7E0] space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#008751]" />
          <h4 className="font-bold text-sm text-[#1A1A1A]">Security & Password</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type password"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isChangingPassword || !newPassword}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
          >
            {isChangingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-200 space-y-3">
        <div className="flex items-center gap-2 text-rose-800">
          <Trash2 className="w-5 h-5" />
          <h4 className="font-bold text-sm">Delete Account</h4>
        </div>
        <p className="text-xs text-rose-700">
          Permanently scrub your profile. In accordance with anti-fraud financial laws, KYC records are retained for compliance purposes.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition"
          >
            Request Account Deletion
          </button>
        ) : (
          <div className="p-4 bg-white rounded-xl border border-rose-300 space-y-3">
            <p className="text-xs font-bold text-rose-900">
              Are you absolutely sure? You will be signed out immediately and will lose access.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

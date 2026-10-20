import React, { useState } from 'react';
import { UserProfile, KYCData } from '../../types';
import { ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitKYC } from '../../lib/dbHelpers';

export interface KycTabProps {
  userProfile: UserProfile;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh?: () => void;
  onSubmitKYC?: (kycData: Omit<KYCData, 'submittedAt'>) => Promise<void>;
}

export default function KycTab({
  userProfile,
  addToast,
  onRefresh,
  onSubmitKYC,
}: KycTabProps) {
  const [fullName, setFullName] = useState(userProfile.kycData?.fullName || '');
  const [idType, setIdType] = useState<KYCData['idType']>(userProfile.kycData?.idType || 'nin_paper');
  const [idNumber, setIdNumber] = useState(userProfile.kycData?.idNumber || '');
  const [screenshotUrl, setScreenshotUrl] = useState(userProfile.kycData?.screenshotUrl || '');
  const [holdingIdUrl, setHoldingIdUrl] = useState(userProfile.kycData?.holdingIdUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !idNumber.trim()) {
      addToast('Please enter your full name and ID number.', 'error');
      return;
    }
    if (!screenshotUrl.trim() || !holdingIdUrl.trim()) {
      addToast('Please provide both ID document and selfie with ID photo.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Omit<KYCData, 'submittedAt'> = {
        fullName: fullName.trim(),
        idType,
        idNumber: idNumber.trim(),
        screenshotUrl: screenshotUrl.trim(),
        holdingIdUrl: holdingIdUrl.trim(),
      };

      if (onSubmitKYC) {
        await onSubmitKYC(payload);
      } else {
        await submitKYC(userProfile.uid, payload);
      }
      addToast('KYC submitted successfully for review!', 'success');
      onRefresh?.();
    } catch {
      addToast('Failed to submit KYC verification documents.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E0E7E0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#008751]" />
            <h3 className="font-bold text-base text-[#1A1A1A]">Identity Verification (KYC)</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Required by Nigerian financial compliance standards to unlock buy and sell limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {userProfile.kycStatus === 'approved' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold uppercase">
              <CheckCircle2 className="w-4 h-4" /> Verified Trader
            </span>
          )}
          {userProfile.kycStatus === 'pending' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold uppercase">
              <Clock className="w-4 h-4" /> Pending Admin Review
            </span>
          )}
          {userProfile.kycStatus === 'rejected' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold uppercase">
              <AlertCircle className="w-4 h-4" /> Resubmission Required
            </span>
          )}
          {userProfile.kycStatus === 'none' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase">
              Unverified
            </span>
          )}
        </div>
      </div>

      {userProfile.kycStatus === 'rejected' && userProfile.kycData?.rejectionReason && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
          <span className="font-bold block mb-1">Feedback from Compliance Officer:</span>
          {userProfile.kycData.rejectionReason}
        </div>
      )}

      {userProfile.kycStatus !== 'approved' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-[#E0E7E0] space-y-4">
          <h4 className="font-bold text-sm text-[#1A1A1A]">Submit Identity Information</h4>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Full Legal Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As shown on your official ID document"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Document Type</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
              >
                <option value="nin_paper">NIN Slip (Paper)</option>
                <option value="nin_plastic">NIN Card (Plastic)</option>
                <option value="drivers_license">Driver's License</option>
                <option value="voters_card">Voter's Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ID / Document Number</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="e.g. 11-digit NIN or Document Number"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ID Document URL / Proof
              </label>
              <input
                type="text"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://... or photo link"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Photo of you holding your ID
              </label>
              <input
                type="text"
                value={holdingIdUrl}
                onChange={(e) => setHoldingIdUrl(e.target.value)}
                placeholder="https://... or snapshot link"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#008751] hover:bg-[#007043] text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting Documents...' : 'Submit Verification'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

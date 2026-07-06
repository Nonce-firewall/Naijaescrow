import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F7F9F7] font-sans text-[#1A1A1A]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#E0E7E0]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#008751] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to 9ija Escrow
          </a>
          <div className="flex items-center gap-2 text-sm font-bold text-[#008751]">
            <ShieldCheck className="w-4 h-4" />
            Privacy Policy
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="max-w-2xl mx-auto px-4 sm:px-6 py-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E6F4EA] border border-[#C5DFC9] rounded-full text-xs font-semibold text-[#008751] mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Legal Document
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500 font-mono">Last updated: July 2026</p>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-3xl border border-[#E0E7E0] shadow-sm divide-y divide-[#F0F4F0]">
          {[
            {
              num: '1',
              title: 'Data We Collect',
              body: "We collect your email address, KYC identity documents (NIN, Voter's Card, Driver's License), order transaction records, dispute submissions, and bank/wallet details you provide for trades.",
            },
            {
              num: '2',
              title: 'How We Use Your Data',
              body: 'Your data is used exclusively to verify your identity, process trades, handle disputes, and prevent fraud. We do not sell, lease, or share your personal information with third parties except where required by Nigerian law.',
            },
            {
              num: '3',
              title: 'KYC Documents',
              body: 'KYC submissions are encrypted at rest. Only authorised 9ija Escrow administrators can review your submitted documents. Documents are retained for a minimum of five years in compliance with AML regulations.',
            },
            {
              num: '4',
              title: 'Dispute Data',
              body: 'When you submit a dispute, we store your message, attached evidence images, and all chat messages between you and admin. This data is visible to you and platform administrators only. Resolved disputes are retained for audit and compliance purposes.',
            },
            {
              num: '5',
              title: 'Account Status Records',
              body: 'If your account is suspended or terminated, we record the reason and timestamp. This information is retained to prevent circumvention of platform restrictions.',
            },
            {
              num: '6',
              title: 'Notification Preferences',
              body: 'You may customize which notifications you receive (order updates, KYC status, announcements). Your preferences are stored securely and used only to filter communications to you.',
            },
            {
              num: '7',
              title: 'Cookies & Tracking',
              body: 'We use session cookies strictly to maintain your authenticated session. No advertising or analytics cookies are used.',
            },
            {
              num: '8',
              title: 'Your Rights',
              body: 'You may request deletion of your account and associated data by contacting support. Note that transaction records, dispute history, and KYC documents may be retained for regulatory compliance even after account deletion.',
            },
          ].map((section) => (
            <div key={section.num} className="px-6 py-5">
              <h2 className="font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-[#E6F4EA] text-[#008751] rounded-full text-xs font-bold shrink-0">
                  {section.num}
                </span>
                {section.title}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed pl-8">{section.body}</p>
            </div>
          ))}

          {/* Contact */}
          <div className="px-6 py-5">
            <h2 className="font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-[#E6F4EA] text-[#008751] rounded-full text-xs font-bold shrink-0">
                9
              </span>
              Contact
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed pl-8">
              Privacy inquiries:{' '}
              <a href="mailto:privacy@9ijaescrow.com" className="text-[#008751] font-semibold hover:underline">
                privacy@9ijaescrow.com
              </a>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} 9ija Escrow. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

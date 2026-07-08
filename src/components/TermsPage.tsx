import React from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
            Back to Home
          </a>
          <div className="flex items-center gap-2 text-sm font-bold text-[#008751]">
            <FileText className="w-4 h-4" />
            Terms of Use
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
            <FileText className="w-3.5 h-3.5" />
            Legal Document
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] tracking-tight">Terms of Use</h1>
          <p className="mt-2 text-sm text-gray-500 font-mono">Last updated: July 2026</p>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-3xl border border-[#E0E7E0] shadow-sm divide-y divide-[#F0F4F0]">
          {[
            {
              num: '1',
              title: 'Eligibility',
              body: "You must be at least 18 years old and a resident of Nigeria to use 9ija Escrow. By signing up, you confirm that all information you provide is accurate and truthful.",
            },
            {
              num: '2',
              title: 'KYC Requirement',
              body: 'All traders must complete KYC verification before placing orders. Submitting false or doctored identity documents will result in immediate account suspension and may be reported to relevant authorities.',
            },
            {
              num: '3',
              title: 'Trade Rules',
              body: 'You must provide legitimate bank payment proofs. Fake screenshots, reversed payments, or third-party transfers are strictly prohibited and result in permanent KYC cancellation and order forfeiture.',
            },
            {
              num: '4',
              title: 'Rates & Fees',
              body: 'The exchange rate locked at order creation is your guaranteed payout rate. Network fees are covered by 9ija Escrow for USDT trades. However in some cases for other listed tokens, a small trade fee (displayed before order confirmation) may apply. No hidden charges.',
            },
            {
              num: '5',
              title: 'Supported Networks',
              body: 'We support trading on BSC (BNB Smart Chain), Tron, Polygon and many other blockchain networks. You are responsible for providing correct wallet addresses for your chosen network. Funds sent to incorrect addresses are irrecoverable.',
            },
            {
              num: '6',
              title: 'Dispute Resolution',
              body: 'If you have an issue with a trade, you may submit a dispute with evidence (screenshots, transaction IDs). Admin will review and respond within 10-20 minutes. Once resolved, disputes are marked with the admin\'s decision and cannot be reopened. Abuse of the dispute system (spam submissions, false claims) may result in account suspension.',
            },
            {
              num: '7',
              title: 'Account Status',
              body: 'Accounts may be active, suspended, or terminated. Suspended accounts cannot place new orders but retain read access to history. Terminated accounts are permanently restricted. You may request the deletion of your account, however all your account activities, KYC data and transaction records are retained for regulatory compliance.',
            },
            {
              num: '8',
              title: 'Liability',
              body: '9ija Escrow acts as an intermediary and is not liable for losses arising from user-provided incorrect wallet addresses, bank details, or payment delays caused by third-party banks and blockchain congestion',
            },
            {
              num: '9',
              title: 'Termination',
              body: 'We reserve the right to suspend or terminate any account found to be in violation of these terms, without prior notice.',
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
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} 9ija Escrow. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

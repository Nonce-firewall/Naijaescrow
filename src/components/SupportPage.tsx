import React from 'react';
import { motion } from 'motion/react';
import { LifeBuoy, ArrowLeft, Mail, MessageCircle } from 'lucide-react';

export default function SupportPage() {
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
            <LifeBuoy className="w-4 h-4" />
            Support
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
            <LifeBuoy className="w-3.5 h-3.5" />
            Get Help
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] tracking-tight">Support</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Our support team is available Monday–Friday, 9 AM–6 PM WAT.
            We typically respond within 2–4 business hours.
          </p>
        </div>

        {/* Contact cards */}
        <div className="space-y-4 mb-6">
          <motion.a
            href="mailto:support@9ijaescrow.com"
            className="flex items-start gap-4 bg-white rounded-3xl border border-[#E0E7E0] shadow-sm p-5 hover:border-[#008751]/30 hover:shadow-md transition-all group"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-3 bg-[#008751]/10 rounded-2xl shrink-0 group-hover:bg-[#008751]/15 transition-colors">
              <Mail className="w-5 h-5 text-[#008751]" />
            </div>
            <div>
              <div className="font-bold text-[#1A1A1A] mb-0.5">Email Support</div>
              <div className="text-xs text-gray-500 mb-1.5">For account issues, KYC reviews, and trade disputes</div>
              <span className="text-[#008751] font-semibold text-sm hover:underline">
                support@9ijaescrow.com
              </span>
            </div>
          </motion.a>

          <motion.a
            href="https://wa.me/2349000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 bg-white rounded-3xl border border-[#E0E7E0] shadow-sm p-5 hover:border-[#008751]/30 hover:shadow-md transition-all group"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-3 bg-[#008751]/10 rounded-2xl shrink-0 group-hover:bg-[#008751]/15 transition-colors">
              <MessageCircle className="w-5 h-5 text-[#008751]" />
            </div>
            <div>
              <div className="font-bold text-[#1A1A1A] mb-0.5">WhatsApp Support</div>
              <div className="text-xs text-gray-500 mb-1.5">Urgent trade issues and real-time status checks</div>
              <span className="text-[#008751] font-semibold text-sm hover:underline">
                +234 900 000 0000
              </span>
            </div>
          </motion.a>
        </div>

        {/* Tip */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <span className="font-bold block mb-1">Before reaching out</span>
          Please have your order ID or registered email address ready to help us resolve your issue faster.
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} 9ija Escrow. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

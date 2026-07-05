import React from 'react';
import { motion } from 'motion/react';
import { LifeBuoy, ArrowLeft, Mail } from 'lucide-react';

const CHANNELS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp Support',
    desc: 'Urgent trade issues and real-time status checks',
    handle: '+234 916 550 1298',
    href: 'https://wa.me/2349165501298',
    logo: '/whatsapp-icon.png',
    ring: 'ring-green-300',
    bg: 'bg-green-50 hover:bg-green-100/70',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    badgeLabel: 'Live',
    handleColor: 'text-green-700',
  },
  {
    key: 'telegram',
    label: 'Telegram Support',
    desc: 'Quick help, announcements & order alerts',
    handle: '@NijaEscrow',
    href: 'https://t.me/NijaEscrow',
    logo: '/telegram-icon.png',
    ring: 'ring-sky-300',
    bg: 'bg-sky-50 hover:bg-sky-100/70',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-700',
    badgeLabel: 'Active',
    handleColor: 'text-sky-600',
  },
] as const;

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

        {/* Social channels */}
        <div className="space-y-4 mb-4">
          {CHANNELS.map((ch, i) => (
            <motion.a
              key={ch.key}
              href={ch.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-5 rounded-3xl border ${ch.bg} ${ch.border} p-5 shadow-sm hover:shadow-md transition-all group`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
            >
              <img
                src={ch.logo}
                alt={ch.label}
                loading="lazy"
                className={`w-16 h-16 rounded-full object-cover shrink-0 ring-2 ${ch.ring} group-hover:scale-105 transition-transform`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[#1A1A1A]">{ch.label}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ch.badge}`}>{ch.badgeLabel}</span>
                </div>
                <p className="text-xs text-gray-500">{ch.desc}</p>
                <p className={`text-sm font-semibold mt-1.5 ${ch.handleColor}`}>{ch.handle}</p>
              </div>
            </motion.a>
          ))}

          {/* Email */}
          <motion.a
            href="mailto:contact@9ijaescrow.com.ng"
            className="flex items-center gap-5 bg-white rounded-3xl border border-[#E0E7E0] shadow-sm p-5 hover:border-[#008751]/30 hover:shadow-md transition-all group"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2 }}
          >
            <div className="w-16 h-16 rounded-full bg-[#E6F4EA] border border-[#C5DFC9] flex items-center justify-center shrink-0 group-hover:bg-[#d4edda] transition-colors">
              <Mail className="w-6 h-6 text-[#008751]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#1A1A1A] mb-1">Email Support</p>
              <p className="text-xs text-gray-500">For account issues, KYC reviews, and trade disputes</p>
              <p className="text-sm font-semibold text-[#008751] mt-1.5">contact@9ijaescrow.com.ng</p>
            </div>
          </motion.a>
        </div>

        {/* Tip */}
        <motion.div
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.22 }}
        >
          <span className="font-bold block mb-1">Before reaching out</span>
          Please have your order ID or registered email address ready to help us resolve your issue faster.
        </motion.div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} 9ija Escrow. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

/**
 * SupportDropdown — floating panel that drops from the Navbar support button.
 * Handles its own Escape-key listener; click-outside is managed by the parent.
 */
import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, X } from 'lucide-react';

interface SupportDropdownProps {
  onClose: () => void;
}

const CHANNELS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp Support',
    desc: 'Urgent trade issues & real-time status checks',
    handle: '+234 916 550 1298',
    href: 'https://wa.me/2349165501298',
    logo: '/whatsapp-icon.png',
    ring: 'ring-green-200',
    bg: 'bg-green-50 hover:bg-green-100/80',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    badgeLabel: 'Live',
  },
  {
    key: 'telegram',
    label: 'Telegram Support',
    desc: 'Quick help, announcements & order alerts',
    handle: '@NijaEscrow',
    href: 'https://t.me/NijaEscrow',
    logo: '/telegram-icon.png',
    ring: 'ring-sky-200',
    bg: 'bg-sky-50 hover:bg-sky-100/80',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-700',
    badgeLabel: 'Active',
  },
] as const;

export default function SupportDropdown({ onClose }: SupportDropdownProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="absolute right-0 top-full mt-2.5 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#E0E7E0] z-50 overflow-hidden"
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F4F0]">
        <div>
          <p className="text-xs font-bold text-[#1A1A1A]">Contact Support</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Mon–Fri · 9 AM–6 PM WAT · 2–4 hr response</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[#F7F9F7] text-gray-400 hover:text-gray-600 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Social channels */}
      <div className="p-3 space-y-2">
        {CHANNELS.map((ch) => (
          <a
            key={ch.key}
            href={ch.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${ch.bg} ${ch.border} transition-colors group`}
          >
            <img
              src={ch.logo}
              alt={ch.label}
              loading="lazy"
              className={`w-10 h-10 rounded-full object-cover shrink-0 ring-2 ${ch.ring}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1A1A1A] truncate">{ch.label}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${ch.badge}`}>{ch.badgeLabel}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{ch.desc}</p>
              <p className="text-[11px] font-semibold text-gray-700 mt-0.5">{ch.handle}</p>
            </div>
          </a>
        ))}

        {/* Email */}
        <a
          href="mailto:support@9ijaescrow.com.ng"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#E0E7E0] bg-[#F7F9F7] hover:bg-[#EEF4EE] transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-[#E6F4EA] border border-[#C5DFC9] flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-[#008751]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#1A1A1A]">Email Support</p>
            <p className="text-[10px] text-gray-500 mt-0.5">KYC reviews & trade disputes</p>
            <p className="text-[11px] font-semibold text-[#008751] mt-0.5">support@9ijaescrow.com.ng</p>
          </div>
        </a>
      </div>

      {/* Tip */}
      <div className="mx-3 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800">
        <span className="font-bold">Tip:</span> Have your order ID or email ready for faster help.
      </div>
    </motion.div>
  );
}

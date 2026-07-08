import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ShieldCheck, TrendingUp, Lock, ArrowRight, Bell, UserCheck, X, Mail, MessageCircle, Zap, ChevronRight, Activity, BarChart3, Users, UserPlus, ScanFace, ReceiptText, Banknote } from 'lucide-react';
import { Announcement, AdminSettings } from '../types';
import { getPublicStats, PublicStats } from '../lib/dbHelpers';

type ModalType = 'privacy' | 'terms' | 'support' | null;

function Modal({ type, onClose }: { type: ModalType; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 12, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E7E0] shrink-0">
          <h2 className="font-bold text-[#1A1A1A] text-base">
            {type === 'privacy' && 'Privacy Policy'}
            {type === 'terms' && 'Terms of Use'}
            {type === 'support' && 'Support'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F9F7] text-gray-400 hover:text-[#1A1A1A] transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-sm text-gray-600 leading-relaxed space-y-4">
          {type === 'privacy' && (
            <>
              <p className="text-xs text-gray-400 font-mono">Last updated: July 2026</p>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">1. Data We Collect</h3>
                <p>We collect your email address, KYC identity documents (NIN, Voter's Card, Driver's License), and order transaction records solely to facilitate P2P escrow trades and comply with financial regulations.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">2. How We Use Your Data</h3>
                <p>Your data is used exclusively to verify your identity, process trades, and prevent fraud. We do not sell, lease, or share your personal information with third parties except where required by Nigerian law.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">3. KYC Documents</h3>
                <p>KYC submissions are encrypted at rest. Only authorised 9ija Escrow administrators can review your submitted documents. Documents are retained for a minimum of five years in compliance with AML regulations.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">4. Cookies & Tracking</h3>
                <p>We use session cookies strictly to maintain your authenticated session. No advertising or analytics cookies are used.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">5. Your Rights</h3>
                <p>You may request the deletion of your account from your dashboard settings, however your account activities, KYC data and transaction records may be retained for regulatory compliance after account your deletion is in effect.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">6. Contact</h3>
                <p>Privacy inquiries: <span className="text-[#008751] font-semibold">privacy@9ijaescrow.com</span></p>
              </section>
            </>
          )}
          {type === 'terms' && (
            <>
              <p className="text-xs text-gray-400 font-mono">Last updated: July 2026</p>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">1. Eligibility</h3>
                <p>You must be at least 18 years old and a resident of Nigeria to use 9ija Escrow. By signing up, you confirm that all information you provide is accurate and truthful.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">2. KYC Requirement</h3>
                <p>All traders must complete KYC verification before placing orders. Submitting false or doctored identity documents will result in immediate account suspension and may be reported to relevant authorities.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">3. Trade Rules</h3>
                <p>You must provide legitimate bank payment proofs that reflected your verified legal name, Fake screenshots, reversed payments, or third-party transfers are strictly prohibited and it may result in permanent KYC cancellation and order forfeiture.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">4. Rates & Fees</h3>
                <p>The exchange rate locked at order creation is your guaranteed payout rate. Standard blockchain network (mining) fees are covered by 9ija Escrow, however some transactions may attract little fraction of network fees to ease the fluctuation of the blockchain validation charges.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">5. Liability</h3>
                <p>9ija Escrow acts as an intermediary and is not liable for losses arising from user-provided incorrect wallet addresses, bank details, blockchain congestion and payment delays caused by third-party banks.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">6. Termination</h3>
                <p>We reserve the right to suspend or terminate any account found to be in violation of these terms, without prior notice.</p>
              </section>
            </>
          )}
          {type === 'support' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Our support team is available Monday–Sunday, 9 AM–6 PM. We typically respond within 1–2 business hours.</p>

              {/* WhatsApp */}
              <a href="https://wa.me/2349165501298" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 hover:bg-green-100/70 transition-colors group"
              >
                <img src="/whatsapp-icon.png" alt="WhatsApp" loading="lazy"
                  className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-green-300 group-hover:ring-green-400 transition" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1A1A1A] text-sm">WhatsApp Support</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Live</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Urgent trade issues and real-time status checks</div>
                  <span className="text-green-700 font-semibold text-sm mt-1 block">+234 916 550 1298</span>
                </div>
              </a>

              {/* Telegram */}
              <a href="https://t.me/NijaEscrow" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-2xl p-4 hover:bg-sky-100/70 transition-colors group"
              >
                <img src="/telegram-icon.png" alt="Telegram" loading="lazy"
                  className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-sky-300 group-hover:ring-sky-400 transition" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1A1A1A] text-sm">Telegram Support</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700">Active</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Quick help, announcements & order alerts</div>
                  <span className="text-sky-600 font-semibold text-sm mt-1 block">@NijaEscrow</span>
                </div>
              </a>

              {/* Email */}
              <a href="mailto:contact@9ijaescrow.com.ng"
                className="flex items-center gap-3 bg-[#F0F7F2] border border-[#D1E6D8] rounded-2xl p-4 hover:bg-[#e6f4ea] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#E6F4EA] border border-[#C5DFC9] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#008751]" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A] text-sm mb-0.5">Email Support</div>
                  <div className="text-xs text-gray-500">For account issues, KYC reviews, and trade disputes</div>
                  <span className="text-[#008751] font-semibold text-sm mt-1 block hover:underline">contact@9ijaescrow.com.ng</span>
                </div>
              </a>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
                <span className="font-bold block mb-0.5">Before reaching out</span>
                Please have your order ID or registered email address ready to help us resolve your issue faster.
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── How It Works section ──────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    icon: <UserPlus className="w-5 h-5" />,
    title: 'Create An Account',
    desc: 'Sign up with your Google Account or Email & Password in under 60 seconds.',
    color: 'emerald',
    accent: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
    numColor: 'text-emerald-600',
    dot: 'bg-emerald-400',
  },
  {
    num: '02',
    icon: <ScanFace className="w-5 h-5" />,
    title: 'Complete KYC',
    desc: 'Submit a government-issued ID (NIN, Voter\'s Card, or Driver\'s License). Manually reviewed by our team.',
    color: 'sky',
    accent: 'bg-sky-500/10 border-sky-500/25 text-sky-400',
    numColor: 'text-sky-600',
    dot: 'bg-sky-400',
  },
  {
    num: '03',
    icon: <ReceiptText className="w-5 h-5" />,
    title: 'Place Your Order',
    desc: 'Choose BUY or SELL, enter your amount and network, then upload your bank payment proof.',
    color: 'violet',
    accent: 'bg-violet-500/10 border-violet-500/25 text-violet-400',
    numColor: 'text-violet-600',
    dot: 'bg-violet-400',
  },
  {
    num: '04',
    icon: <Banknote className="w-5 h-5" />,
    title: 'Receive Your Funds',
    desc: 'Admin verifies payment and releases your transactions directly into your provided wallet address or bank account.',
    color: 'amber',
    accent: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
    numColor: 'text-amber-600',
    dot: 'bg-amber-400',
  },
];

function HowItWorks({ onNavigate }: { onNavigate: () => void }) {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#F7F9F7]">
      <div className="max-w-5xl mx-auto">

        {/* Heading */}
        <motion.div
          className="text-center mb-12 sm:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-[#008751] bg-[#E6F4EA] border border-[#C5DFC9] px-3 py-1.5 rounded-full mb-4 font-mono">
            Simple · Secure · Fast
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
            Trade in 4 Simple Steps
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm mt-3 leading-relaxed">
            From account creation to receiving funds — the whole process is transparent, convenient, and admin-verified.
          </p>
        </motion.div>

        {/* Desktop: horizontal steps with connecting line */}
        <div className="hidden sm:block relative">
          {/* Connecting line behind cards */}
          <div className="absolute top-[44px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-emerald-500/20 via-violet-500/20 to-amber-500/20 z-0" />

          <div className="grid grid-cols-4 gap-4 relative z-10">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
                className="flex flex-col items-center text-center group"
              >
                {/* Icon circle */}
                <motion.div
                  className={`w-[52px] h-[52px] rounded-2xl border ${step.accent} flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform duration-300 bg-white`}
                  whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
                >
                  {step.icon}
                </motion.div>

                {/* Step number */}
                <div className={`text-[10px] font-black font-mono tracking-widest ${step.numColor} mb-1.5 select-none`}>
                  STEP {step.num}
                </div>

                <h3 className="text-sm font-bold text-[#1A1A1A] mb-2 leading-snug">{step.title}</h3>
                <p className="text-[12px] text-gray-700 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical steps with left timeline */}
        <div className="sm:hidden relative pl-10">
          {/* Vertical line */}
          <div className="absolute left-4 top-3 bottom-3 w-px bg-gradient-to-b from-emerald-400/40 via-violet-400/40 to-amber-400/40" />

          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: 'easeOut' }}
                className="relative"
              >
                {/* Timeline dot */}
                <div className={`absolute -left-[26px] top-3 w-3 h-3 rounded-full border-2 border-[#F7F9F7] ${step.dot} shadow-sm`} />

                <div className={`bg-white border rounded-2xl p-4 shadow-sm border-gray-100`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-xl border ${step.accent} shrink-0`}>
                      {step.icon}
                    </div>
                    <div>
                      <div className={`text-[9px] font-black font-mono tracking-widest ${step.numColor}`}>STEP {step.num}</div>
                      <h3 className="text-sm font-bold text-[#1A1A1A] leading-tight">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-[12px] text-gray-700 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA row */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.button
            onClick={onNavigate}
            className="inline-flex items-center gap-2 bg-[#008751] hover:bg-[#007043] text-white font-bold px-4 py-2 rounded-xl transition text-sm cursor-pointer shadow-lg shadow-emerald-900/20"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <span className="text-xs text-gray-400">KYC in minutes!</span>
        </motion.div>

      </div>
    </section>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Animated count-up hook (single RAF loop for all three values) ─────────────
// One requestAnimationFrame + one setState per frame instead of 3 separate loops.
function useCountUps(t0: number, t1: number, t2: number, duration = 1200): [number, number, number] {
  const [vals, setVals] = useState<[number, number, number]>([0, 0, 0]);
  const raf  = useRef<number | null>(null);
  const prev = useRef<[number, number, number]>([0, 0, 0]);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    // If all targets are still zero (data not loaded yet) do nothing
    if (t0 === 0 && t1 === 0 && t2 === 0) { setVals([0, 0, 0]); return; }
    // Skip animation on reduced-motion preference — jump straight to target
    if (prefersReduced) { prev.current = [t0, t1, t2]; setVals([t0, t1, t2]); return; }

    const start = performance.now();
    const [f0, f1, f2] = prev.current;
    const [d0, d1, d2] = [t0 - f0, t1 - f1, t2 - f2];

    const tick = (now: number) => {
      const p    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setVals([
        Math.round(f0 + d0 * ease),
        Math.round(f1 + d1 * ease),
        Math.round(f2 + d2 * ease),
      ]);
      if (p < 1) { raf.current = requestAnimationFrame(tick); }
      else       { prev.current = [t0, t1, t2]; }
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [t0, t1, t2, duration, prefersReduced]);

  return vals;
}

// ── Live stats strip ──────────────────────────────────────────────────────────
function StatsStrip() {
  const [stats, setStats]     = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  // Defer the network fetch until the section is near the viewport — avoids a
  // burst of work (network response + RAF count-up) coinciding with the scroll.
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: '300px' }, // start loading 300 px before it enters view
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const doFetch = async () => {
    try {
      const s = await getPublicStats();
      setStats(s);
      setFetchedAt(Date.now());
    } catch { /* silently ignore on public page */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!visible) return;
    doFetch();
    const poll = setInterval(doFetch, 30_000);
    return () => clearInterval(poll);
  }, [visible]);

  // Single RAF loop — one setState per frame instead of three separate loops.
  const [trades, volume, traders] = useCountUps(
    stats?.tradesCompleted ?? 0,
    stats?.usdtVolume      ?? 0,
    stats?.activeTraders   ?? 0,
  );

  const items = [
    {
      icon: <Activity className="w-4 h-4" />,
      label: 'Trades Completed',
      value: loading ? '—' : trades.toLocaleString(),
      sub: 'All-time settled orders',
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5',
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: 'USDT Volume',
      value: loading ? '—' : volume >= 1000
        ? `${(volume / 1000).toFixed(1)}K`
        : volume.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      sub: 'Total USDT exchanged',
      color: 'text-sky-400',
      border: 'border-sky-500/20',
      bg: 'bg-sky-500/5',
    },
    {
      icon: <Users className="w-4 h-4" />,
      label: 'Active Traders',
      value: loading ? '—' : traders.toLocaleString(),
      sub: 'Verified platform users',
      color: 'text-violet-400',
      border: 'border-violet-500/20',
      bg: 'bg-violet-500/5',
    },
  ];

  return (
    <section ref={sectionRef} className="bg-[#0d1a0f] border-y border-[#008751]/20 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">Live Stats</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {loading ? 'Loading…' : fetchedAt
              ? `Updated at ${new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Refreshes every 30s'}
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              className={`${item.bg} border ${item.border} rounded-2xl px-5 py-4 flex items-center gap-4`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1, ease: 'easeOut' }}
            >
              <div className={`p-2.5 rounded-xl bg-slate-900/60 ${item.color} shrink-0`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-0.5">{item.label}</div>
                <div className={`text-2xl font-bold font-mono ${item.color} leading-none`}>
                  {loading ? (
                    <span className="inline-block w-16 h-6 bg-slate-800 rounded animate-pulse" />
                  ) : item.value}
                </div>
                <div className="text-[10px] text-slate-600 mt-1">{item.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Interactive demo trading widget ──────────────────────────────────────────
const NETWORKS = ['BSC', 'Tron', 'Polygon'] as const;
type Network = typeof NETWORKS[number];

function TradingWidget({
  sellRate,
  buyRate,
  onCtaClick,
}: {
  sellRate: number;
  buyRate: number;
  onCtaClick: () => void;
}) {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState<Network>('BSC');

  // Active rate switches with the tab
  const activeRate = tab === 'buy' ? buyRate : sellRate;

  // Both tabs: user always enters a USDT amount.
  // BUY  → they pay NGN  (ngnAmt = USDT × rate)
  // SELL → they receive NGN (ngnAmt = USDT × rate)
  const numAmount = parseFloat(amount) || 0;
  const ngnAmt   = numAmount * activeRate;
  const hasAmt   = numAmount > 0;

  const handleInput = (v: string) => {
    if (/^\d*\.?\d*$/.test(v)) setAmount(v);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">

      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-800 bg-slate-950">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        <div className="mx-auto text-[10px] text-slate-500 font-mono bg-slate-900 px-3 py-0.5 rounded-full border border-slate-800">
          9ijaescrow.com.ng
        </div>
      </div>

      {/* Widget body */}
      <div className="p-4 space-y-3 font-mono text-xs">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-bold">9ija Escrownian</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider">Mode:</span>
            <span className="text-[9px] text-amber-400 font-bold uppercase border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 rounded">DEMO</span>
          </div>
        </div>

        {/* Rate strip — value animates when tab switches */}
        <div className={`rounded-xl px-3 py-2 flex items-center justify-between border transition-colors duration-300 ${
          tab === 'buy'
            ? 'bg-slate-950 border-slate-800'
            : 'bg-slate-950 border-slate-800'
        }`}>
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">
              {tab === 'buy' ? 'Buy Rate' : 'Sell Rate'}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${tab}-rate`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`font-bold text-base ${tab === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                ₦{activeRate.toLocaleString()}
                <span className="text-slate-500 text-[10px] font-normal"> /USDT</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg transition-colors duration-300 ${
            tab === 'buy'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            <Zap className="w-2.5 h-2.5" />
            LIVE
          </div>
        </div>

        {/* BUY / SELL tabs — CSS-only indicator, no layout measurement */}
        <div className="relative flex bg-slate-950 rounded-xl p-0.5 border border-slate-800">
          {(['buy', 'sell'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setAmount(''); }}
              className="relative flex-1 py-2 text-[11px] font-bold uppercase tracking-wider z-10 transition-colors duration-200 cursor-pointer rounded-lg"
              style={{ color: tab === t ? (t === 'buy' ? '#4ade80' : '#f87171') : '#64748b' }}
            >
              {/* Per-button background that fades in/out — opacity-only, compositor-driven */}
              <span className={`absolute inset-0 rounded-[10px] pointer-events-none transition-opacity duration-200 ${
                t === 'buy' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'
              } ${tab === t ? 'opacity-100' : 'opacity-0'}`} />
              {t === 'buy' ? '▲ Buy' : '▼ Sell'}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-2"
          >
            <div className={`bg-slate-950 border rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors ${
              tab === 'buy' ? 'border-slate-700 focus-within:border-emerald-500/50' : 'border-slate-700 focus-within:border-rose-500/40'
            }`}>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider shrink-0">
                USDT
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleInput(e.target.value)}
                placeholder={tab === 'buy' ? '0.00' : '0'}
                className="flex-1 bg-transparent outline-none text-white font-bold text-sm placeholder-slate-600 w-0"
              />
              <span className="text-[9px] text-slate-600 shrink-0">amount</span>
            </div>

            {/* Live conversion result */}
            <AnimatePresence>
              {hasAmt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className={`border rounded-xl px-3 py-2 flex items-center justify-between ${
                    tab === 'buy'
                      ? 'bg-emerald-950/40 border-emerald-800/30'
                      : 'bg-rose-950/30 border-rose-800/20'
                  }`}>
                    <span className="text-slate-400 text-[9px]">You {tab === 'buy' ? 'pay' : 'receive'}</span>
                    <span className={`font-bold text-[11px] ${tab === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₦{ngnAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Network selector */}
        <div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">Network</div>
          <div className="flex gap-1.5">
            {NETWORKS.map((n) => (
              <button
                key={n}
                onClick={() => setNetwork(n)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                  network === n
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* CTA button */}
        <button
          onClick={onCtaClick}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider cursor-pointer bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] transition-[transform,background-color] duration-150 text-white"
        >
          Initiate Order
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* KYC notice */}
        <div className="flex items-center gap-1.5 px-2">
          <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="text-[9px] text-slate-500">KYC verification required to commence trade</span>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

interface LandingPageProps {
  announcements: Announcement[];
  settings: AdminSettings;
  liveNgnRate?: number | null;
  onNavigate: (page: 'auth' | 'dashboard', extra?: string) => void;
}

export default function LandingPage({ announcements, settings, liveNgnRate, onNavigate }: LandingPageProps) {
  // Effective SELL rate = live market + admin markup; fallback to markup alone when CoinGecko unavailable
  const effectiveSellRate = liveNgnRate
    ? Math.round(liveNgnRate) + settings.usdtSellMarkup
    : settings.usdtSellMarkup;
  const effectiveBuyRate = liveNgnRate
    ? Math.round(liveNgnRate) + settings.usdtBuyMarkup
    : settings.usdtBuyMarkup;
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const publicAnnouncements = announcements.filter(
    (ann) => (ann.scope === 'public' || ann.scope === 'all') && ann.isActive
  );

  return (
    <div className="bg-[#F7F9F7] min-h-screen font-sans text-[#1A1A1A]">
      <AnimatePresence>
        {activeModal && <Modal type={activeModal} onClose={() => setActiveModal(null)} />}
      </AnimatePresence>

      {/* Scrolling Announcement Ticker */}
      {publicAnnouncements.length > 0 && (
        <div className="bg-[#0a1a0f] border-b border-[#008751]/30 overflow-hidden relative" style={{ height: '34px' }}>
          <div className="absolute inset-y-0 left-0 w-10 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #0a1a0f, transparent)' }} />
          <div className="absolute inset-y-0 right-0 w-10 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #0a1a0f, transparent)' }} />
          <div className="flex items-center h-full overflow-hidden">
            <div className="shrink-0 flex items-center gap-1.5 pl-3 pr-4 z-10 bg-[#0a1a0f]">
              <Bell className="w-3 h-3 text-[#00FF85]" />
              <span className="text-[#00FF85] text-[10px] font-bold uppercase tracking-widest font-mono">LIVE</span>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="ticker-track">
                {[...publicAnnouncements, ...publicAnnouncements].map((ann, i) => (
                  <span key={i} className="inline-flex items-center gap-3 px-6 text-[11px] font-medium text-gray-300">
                    <span className="text-[#00FF85] font-bold">▸</span>
                    <span className="font-semibold text-white">{ann.title}:</span>
                    <span>{ann.content}</span>
                    <span className="text-gray-600 mx-2">•••</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <header className="bg-[#1A1A1A] text-white py-10 sm:py-20 px-4 sm:px-6 rounded-b-[2rem]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">

          <div className="space-y-5">
            <motion.div
              className="inline-flex items-center gap-2 bg-[#008751]/20 border border-[#008751]/30 px-3 py-1.5 rounded-full text-[#00FF85] text-[11px] font-bold uppercase tracking-wider"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Direct NGN/USDT P2P Escrow
            </motion.div>

            <motion.h1
              className="text-2xl sm:text-4xl md:text-3xl font-bold tracking-tight leading-tight"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
            >
              Nigeria's Premier<br />
              <span className="text-[#00FF85]">P2P Escrow</span> Ledger
            </motion.h1>

            <motion.p
              className="text-sm sm:text-base text-gray-300 max-w-md leading-relaxed"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: 'easeOut' }}
            >
              The safest way to trade your Naira & other cryptocurrencies for USDT. Trusted and guaranteed p2p transaction tracking, rigorous KYC, and instant admin approvals.
            </motion.p>

            {/* Rate card */}
            <motion.div
              className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center justify-between max-w-sm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease: 'easeOut' }}
            >
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Live Exchange Rate</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-[#00FF85]">₦{effectiveSellRate.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 mb-0.5">/USDT</span>
                </div>
              </div>
              <div className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#008751]/20 border border-[#008751]/30 text-[#00FF85] animate-pulse">
                LIVE
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col sm:flex-row gap-3 pt-1"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32, ease: 'easeOut' }}
            >
              <button
                onClick={() => onNavigate('auth', 'signup')}
                className="inline-flex items-center justify-center gap-2 bg-[#008751] hover:bg-[#007043] text-white font-bold px-4 py-2 md:py-2 rounded-xl cursor-pointer text-sm hover:scale-[1.03] active:scale-[0.97] transition-[transform,background-color] duration-150"
              >
                Create Account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('auth', 'signin')}
                className="inline-flex items-center justify-center border border-gray-700 hover:border-gray-500 text-white font-semibold px-4 py-2 md:py-2 rounded-xl cursor-pointer text-sm hover:scale-[1.03] active:scale-[0.97] transition-[transform,border-color] duration-150"
              >
                Sign In to Trade
              </button>
            </motion.div>
          </div>

          {/* Interactive trading widget */}
          <motion.div
            className="w-full max-w-sm mx-auto md:max-w-none"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: 'easeOut' }}
            style={{ willChange: 'transform, opacity' }}
          >
            <TradingWidget
              sellRate={effectiveSellRate}
              buyRate={effectiveBuyRate}
              onCtaClick={() => onNavigate('auth', 'signup')}
            />
          </motion.div>

        </div>
      </header>

      {/* How It Works */}
      <HowItWorks onNavigate={() => onNavigate('auth', 'signup')} />

      {/* Live stats strip */}
      <StatsStrip />

      {/* Features */}
      <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
            How 9ija Escrow Safeguards Your Trades
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm mt-3 leading-relaxed">
            Orders value are locked in a regulated setup price, until payment is verified by our admin specialists.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: <Lock className="w-5 h-5" />,
              title: 'Ironclad Escrow',
              desc: 'Crypto transactions are deposited into dedicated BSC, Tron, Polygon or any provided wallet address and never released until payment is fully verified.'
            },
            {
              icon: <UserCheck className="w-5 h-5" />,
              title: 'Rigorous KYC',
              desc: 'Valid identity documents (NIN, Voter\'s Card, Driver\'s License) manually checked to prevent fraud and illegal bank activities.'
            },
            {
              icon: <TrendingUp className="w-5 h-5" />,
              title: 'Zero Slippage',
              desc: 'The rate locked at order creation is your exact payout rate, while standard network mining fees are covered by 9ija Escrow in some cases.'
            }
          ].map((f, i) => (
            <motion.div
              key={f.title}
              className="bg-white p-6 rounded-2xl border border-[#E0E7E0] hover:border-[#008751]/30 hover:-translate-y-1 transition-[transform,border-color] duration-200"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="p-2.5 bg-[#E6F4EA] text-[#008751] rounded-xl w-fit mb-4">
                {f.icon}
              </div>
              <h3 className="text-base font-bold mb-2 text-[#1A1A1A]">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 border-t border-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 border-b border-slate-900 pb-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-lg font-bold tracking-wider">9IJA ESCROW</span>
              </div>
              <p className="text-sm leading-relaxed">
                Secure peer-to-peer crypto settlement. Seamless local bank transfers of Naira for USDT with guaranteed dispute resolution.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-bold text-xs uppercase tracking-wider">Data & Privacy</h3>
              <p className="text-xs leading-relaxed">
                KYC data is encrypted and used strictly for fraud mitigation. We do not sell or lease user information.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-bold text-xs uppercase tracking-wider">Terms & Conditions</h3>
              <p className="text-xs leading-relaxed">
                All traders must provide legitimate payment proofs. Fake screenshots or third-party transfers result in immediate KYC cancellation.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 text-xs gap-4">
            <div>&copy; {new Date().getFullYear()} 9ija Escrow Inc. All rights reserved.</div>
            <div className="flex gap-5">
              {/* TEMP: pointing straight to the standalone /privacy page (not the popup) so the URL
                  matches Cloud Console exactly for Google OAuth verification.
                  To restore the popup once verification is done, swap this block back to:
                  <span className="flex items-center gap-1">
                    <button onClick={() => setActiveModal('privacy')} className="hover:text-emerald-400 transition cursor-pointer">Privacy Policy</button>
                    <a href="/privacy" aria-label="Privacy Policy standalone page" className="text-slate-700 hover:text-slate-500 transition text-[10px] leading-none" tabIndex={-1}>↗</a>
                  </span> */}
              <span className="flex items-center gap-1">
                    <button onClick={() => setActiveModal('privacy')} className="hover:text-emerald-400 transition cursor-pointer">Privacy Policy</button>
                    <a href="/privacy" aria-label="Privacy Policy standalone page" className="text-slate-700 hover:text-slate-500 transition text-[10px] leading-none" tabIndex={-1}>↗</a>
                  </span>
              <span className="flex items-center gap-1">
                <button onClick={() => setActiveModal('terms')} className="hover:text-emerald-400 transition cursor-pointer">Terms of Use</button>
                <a href="/terms" aria-label="Terms of Use standalone page" className="text-slate-700 hover:text-slate-500 transition text-[10px] leading-none" tabIndex={-1}>↗</a>
              </span>
              <button onClick={() => setActiveModal('support')} className="hover:text-emerald-400 transition cursor-pointer">Support</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { ShieldCheck, TrendingUp, Lock, ArrowRight, Bell, UserCheck, X, Mail, MessageCircle } from 'lucide-react';
import { Announcement, AdminSettings } from '../types';

type ModalType = 'privacy' | 'terms' | 'support' | null;

function Modal({ type, onClose }: { type: ModalType; onClose: () => void }) {
  if (!type) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
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
                <p>You may request deletion of your account and associated data by contacting support. Note that transaction records may be retained for regulatory compliance even after account deletion.</p>
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
                <p>You must provide legitimate bank payment proofs. Fake screenshots, reversed payments, or third-party transfers are strictly prohibited and result in permanent KYC cancellation and order forfeiture.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">4. Rates & Fees</h3>
                <p>The exchange rate locked at order creation is your guaranteed payout rate. Standard blockchain network (mining) fees are covered by 9ija Escrow. No hidden charges apply.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">5. Liability</h3>
                <p>9ija Escrow acts as an intermediary and is not liable for losses arising from user-provided incorrect wallet addresses, bank details, or payment delays caused by third-party banks.</p>
              </section>
              <section>
                <h3 className="font-bold text-[#1A1A1A] mb-1">6. Termination</h3>
                <p>We reserve the right to suspend or terminate any account found to be in violation of these terms, without prior notice.</p>
              </section>
            </>
          )}
          {type === 'support' && (
            <div className="space-y-5">
              <p>Our support team is available Monday–Friday, 9 AM–6 PM WAT. We typically respond within 2–4 business hours.</p>
              <div className="bg-[#F0F7F2] border border-[#D1E6D8] rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 bg-[#008751]/10 rounded-xl shrink-0">
                  <Mail className="w-4 h-4 text-[#008751]" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A] text-sm mb-0.5">Email Support</div>
                  <div className="text-xs text-gray-500">For account issues, KYC reviews, and trade disputes</div>
                  <a href="mailto:support@9ijaescrow.com" className="text-[#008751] font-semibold text-sm mt-1 block hover:underline">
                    support@9ijaescrow.com
                  </a>
                </div>
              </div>
              <div className="bg-[#F0F7F2] border border-[#D1E6D8] rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 bg-[#008751]/10 rounded-xl shrink-0">
                  <MessageCircle className="w-4 h-4 text-[#008751]" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A] text-sm mb-0.5">WhatsApp Support</div>
                  <div className="text-xs text-gray-500">Urgent trade issues and real-time status checks</div>
                  <a href="https://wa.me/2349000000000" target="_blank" rel="noopener noreferrer" className="text-[#008751] font-semibold text-sm mt-1 block hover:underline">
                    +234 900 000 0000
                  </a>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
                <span className="font-bold block mb-0.5">Before reaching out</span>
                Please have your order ID or registered email address ready to help us resolve your issue faster.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface LandingPageProps {
  announcements: Announcement[];
  settings: AdminSettings;
  onNavigate: (page: 'auth' | 'dashboard', extra?: string) => void;
}

export default function LandingPage({ announcements, settings, onNavigate }: LandingPageProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const publicAnnouncements = announcements.filter(
    (ann) => (ann.scope === 'public' || ann.scope === 'all') && ann.isActive
  );

  return (
    <div className="bg-[#F7F9F7] min-h-screen font-sans text-[#1A1A1A]">
      <Modal type={activeModal} onClose={() => setActiveModal(null)} />

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
      <header className="bg-[#1A1A1A] text-white py-14 sm:py-20 px-4 sm:px-6 rounded-b-[2rem]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-[#008751]/20 border border-[#008751]/30 px-3 py-1.5 rounded-full text-[#00FF85] text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Direct NGN / USDT P2P Escrow
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Nigeria's Premier<br />
              <span className="text-[#00FF85]">P2P Escrow</span> Ledger
            </h1>

            <p className="text-sm sm:text-base text-gray-300 max-w-md leading-relaxed">
              The safest way to trade NGN for USDT. Decentralized transaction tracking, rigorous KYC, and instant admin approvals.
            </p>

            {/* Rate card */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center justify-between max-w-sm">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Live Exchange Rate</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-[#00FF85]">₦{settings.usdtRate.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 mb-0.5">/ 1 USDT</span>
                </div>
              </div>
              <div className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#008751]/20 border border-[#008751]/30 text-[#00FF85] animate-pulse">
                LIVE
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={() => onNavigate('auth', 'signup')}
                className="inline-flex items-center justify-center gap-2 bg-[#008751] hover:bg-[#007043] text-white font-bold px-6 py-3.5 rounded-xl transition cursor-pointer text-sm"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('auth', 'signin')}
                className="inline-flex items-center justify-center border border-gray-700 hover:border-gray-500 text-white font-semibold px-6 py-3.5 rounded-xl transition cursor-pointer text-sm"
              >
                Sign In to Trade
              </button>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="w-full max-w-sm mx-auto lg:max-w-none">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
              <div className="flex items-center gap-1.5 pb-2 px-1 border-b border-slate-800">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <div className="mx-auto text-[10px] text-slate-500 font-mono bg-slate-950 px-3 py-0.5 rounded-full">
                  9ijaescrow.com/dashboard
                </div>
              </div>
              <div className="bg-slate-950 text-white font-mono p-3 rounded-b-lg text-xs space-y-3 select-none">
                <div className="flex items-center justify-between border-b border-emerald-950/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-bold text-emerald-400 text-[10px]">9ija Escrow Web</span>
                  </div>
                  <span className="text-[9px] text-slate-400">KYC APPROVED</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['RATE', `₦${settings.usdtRate}/$`], ['BUY ORDERS', '124 (2 pending)'], ['SELL ORDERS', '89 (0 pending)']].map(([label, val]) => (
                    <div key={label} className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-400">{label}</div>
                      <div className="text-[10px] font-bold text-emerald-400 mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-900 p-2.5 rounded border border-emerald-900/30">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="font-bold text-emerald-400">ACTIVE ORDER #0248</span>
                    <span className="text-amber-400 animate-pulse">AWAITING APPROVAL</span>
                  </div>
                  <div className="text-[9px] text-slate-300">BUY USDT · 500 USDT · Zenith Bank ✓</div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-950 p-2 rounded border border-emerald-800/40">
                  <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[9px] font-bold text-emerald-400">KYC Verified</div>
                    <div className="text-[8px] text-slate-400">Driver's license approved.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Features */}
      <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
            How 9ija Escrow Safeguards Your Trades
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm mt-3 leading-relaxed">
            Assets are locked in a regulated setup until payment is verified by our admin specialists.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: <Lock className="w-5 h-5" />,
              title: 'Ironclad Escrow',
              desc: 'Crypto assets are deposited into dedicated BSC, Tron, or Polygon wallets and never released until payment is fully verified.'
            },
            {
              icon: <UserCheck className="w-5 h-5" />,
              title: 'Rigorous KYC',
              desc: 'Valid identity documents (NIN, Voter\'s Card, Driver\'s License) manually checked to prevent fraud and illegal bank activities.'
            },
            {
              icon: <TrendingUp className="w-5 h-5" />,
              title: 'Zero Slippage',
              desc: 'The rate locked at order creation is your exact payout rate. Standard network mining fees are covered by 9ija Escrow.'
            }
          ].map((f) => (
            <div key={f.title} className="bg-white p-6 rounded-2xl border border-[#E0E7E0] hover:border-[#008751]/30 transition">
              <div className="p-2.5 bg-[#E6F4EA] text-[#008751] rounded-xl w-fit mb-4">
                {f.icon}
              </div>
              <h3 className="text-base font-bold mb-2 text-[#1A1A1A]">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
            </div>
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
                Secure peer-to-peer crypto settlement. Seamless local bank transfers (NGN) for USDT with guaranteed dispute resolution.
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
              <button onClick={() => setActiveModal('privacy')} className="hover:text-emerald-400 transition cursor-pointer">Privacy Policy</button>
              <button onClick={() => setActiveModal('terms')} className="hover:text-emerald-400 transition cursor-pointer">Terms of Use</button>
              <button onClick={() => setActiveModal('support')} className="hover:text-emerald-400 transition cursor-pointer">Support</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

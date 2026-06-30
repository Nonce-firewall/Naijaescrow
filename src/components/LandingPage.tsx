import React from 'react';
import { ShieldCheck, TrendingUp, Lock, ArrowRight, Bell, UserCheck } from 'lucide-react';
import { Announcement, AdminSettings } from '../types';

interface LandingPageProps {
  announcements: Announcement[];
  settings: AdminSettings;
  onNavigate: (page: 'auth' | 'dashboard', extra?: string) => void;
}

export default function LandingPage({ announcements, settings, onNavigate }: LandingPageProps) {
  const publicAnnouncements = announcements.filter(
    (ann) => (ann.scope === 'public' || ann.scope === 'all') && ann.isActive
  );

  return (
    <div className="bg-[#F7F9F7] min-h-screen font-sans text-[#1A1A1A]">

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

      {/* Announcements */}
      {publicAnnouncements.length > 0 && (
        <section className="bg-[#F0F7F2] border-b border-[#D1E6D8] py-7 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4 text-[#1A1A1A]">
              <Bell className="w-4 h-4 text-[#008751]" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Public Announcements</h2>
            </div>
            <div className="space-y-3">
              {publicAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-white p-4 rounded-2xl border border-[#E0E7E0] flex gap-3"
                >
                  <div className="w-1 rounded-full bg-[#008751] shrink-0 self-stretch"></div>
                  <div>
                    <h3 className="font-bold text-[#1A1A1A] text-sm">{ann.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ann.content}</p>
                    <span className="text-[10px] text-gray-400 mt-1.5 block font-mono">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
              <a href="#privacy" className="hover:text-emerald-400 transition">Privacy Policy</a>
              <a href="#terms" className="hover:text-emerald-400 transition">Terms of Use</a>
              <a href="#support" className="hover:text-emerald-400 transition">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

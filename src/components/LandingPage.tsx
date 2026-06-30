import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Smartphone, 
  Laptop, 
  Lock, 
  HelpCircle, 
  ArrowRight, 
  Bell, 
  UserCheck 
} from 'lucide-react';
import { Announcement, AdminSettings } from '../types';

interface LandingPageProps {
  announcements: Announcement[];
  settings: AdminSettings;
  onNavigate: (page: 'auth' | 'dashboard', extra?: string) => void;
}

export default function LandingPage({ announcements, settings, onNavigate }: LandingPageProps) {
  // Filter for public-facing announcements
  const publicAnnouncements = announcements.filter(
    (ann) => (ann.scope === 'public' || ann.scope === 'all') && ann.isActive
  );

  return (
    <div className="bg-[#F7F9F7] min-h-screen font-sans text-[#1A1A1A]">
      {/* Hero Section */}
      <header className="relative bg-[#1A1A1A] text-white overflow-hidden py-24 px-6 rounded-b-[2.5rem] shadow-sm">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#008751]/15 border border-[#008751]/30 px-3.5 py-1.5 rounded-full text-[#00FF85] text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#00FF85]" />
              Direct NGN / USDT P2P Escrow
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Nigeria’s Premier <br />
              <span className="text-[#00FF85]">P2P Escrow</span> Ledger
            </h1>
            <p className="text-base sm:text-lg text-gray-300 max-w-xl font-normal leading-relaxed">
              Experience the safest way to trade NGN for USDT. Fully decentralized transaction tracking, rigorous local bank verifications, and instant automated approvals.
            </p>
            
            {/* Rates ticker styled like the custom Rate block */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-5 flex items-center justify-between max-w-md shadow-inner relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Live Exchange Rate</span>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold italic text-[#00FF85]">₦{settings.usdtRate.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 mb-1">/ 1 USDT</span>
                </div>
              </div>
              <div className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#E6F4EA]/10 border border-[#E6F4EA]/20 text-[#00FF85] animate-pulse relative z-10">
                LIVE RATIO
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-5">
                <div className="w-24 h-24 border-[12px] border-white rounded-full"></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={() => onNavigate('auth', 'signup')}
                className="inline-flex items-center justify-center gap-2 bg-[#008751] hover:bg-[#007043] text-white font-bold px-8 py-4 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-[#008751]/20"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate('auth', 'signin')}
                className="inline-flex items-center justify-center bg-transparent border-2 border-gray-700 hover:border-gray-500 hover:bg-white/5 text-white font-semibold px-8 py-4 rounded-xl transition duration-200 cursor-pointer"
              >
                Sign In to Trade
              </button>
            </div>
          </div>

          {/* Interactive Mockups Col */}
          <div className="lg:col-span-6 relative flex flex-col items-center justify-center">
            {/* Decorative background glow */}
            <div className="absolute w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl -top-10 -right-10"></div>
            
            {/* LAPTOP / PC MOCKUP */}
            <div className="w-full max-w-lg bg-slate-900 rounded-xl p-2.5 shadow-2xl border border-slate-800">
              {/* Laptop Screen Bar */}
              <div className="flex items-center gap-1.5 pb-2 px-1.5 border-b border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <div className="mx-auto text-[10px] text-slate-500 font-mono bg-slate-950 px-4 py-0.5 rounded-full border border-slate-800/40">
                  9ijaescrow.com/dashboard
                </div>
              </div>
              {/* Laptop Screen View */}
              <div className="bg-slate-950 text-white font-mono p-4 rounded-b-lg text-xs space-y-3 select-none">
                <div className="flex items-center justify-between border-b border-emerald-950/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-bold text-emerald-400 text-[10px]">9ija Escrow Web</span>
                  </div>
                  <span className="text-[9px] text-slate-400">KYC APPROVED</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400">RATE</div>
                    <div className="text-xs font-bold text-emerald-400">₦{settings.usdtRate}/$</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400">BUY ORDERS</div>
                    <div className="text-xs font-bold text-white">124 (Pending: 2)</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-400">SELL ORDERS</div>
                    <div className="text-xs font-bold text-white">89 (Pending: 0)</div>
                  </div>
                </div>

                <div className="bg-slate-900/50 p-2.5 rounded border border-emerald-900/30">
                  <div className="flex justify-between items-center text-[10px] mb-1 font-bold text-emerald-400">
                    <span>ACTIVE ORDER #0248</span>
                    <span className="text-amber-400 animate-pulse">AWAITING ADMIN APPROVAL</span>
                  </div>
                  <div className="text-[9px] text-slate-300">Type: BUY USDT | Amount: 500 USDT</div>
                  <div className="text-[9px] text-slate-300">Payment: Zenith Bank • Screenshot Attached</div>
                </div>
              </div>
            </div>

            {/* MOBILE MOCKUP (Overlapping elegantly) */}
            <div className="absolute -bottom-8 -left-4 w-52 bg-slate-900 rounded-[32px] p-3 shadow-2xl border-4 border-slate-800 hidden sm:block">
              {/* Phone Speaker & Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full flex items-center justify-center z-10">
                <span className="w-10 h-1 bg-slate-700 rounded-full"></span>
              </div>
              {/* Phone Screen */}
              <div className="bg-slate-950 rounded-[24px] overflow-hidden p-3 pt-6 text-[10px] font-sans text-white h-60 flex flex-col justify-between select-none">
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between items-center bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                    <span className="font-semibold">Buy Order</span>
                    <span className="text-emerald-400 font-bold">₦770,000</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                    <span className="font-semibold">Sell Order</span>
                    <span className="text-emerald-400 font-bold">₦385,000</span>
                  </div>
                </div>
                <div className="bg-emerald-950 p-2 rounded-xl text-[9px] border border-emerald-800/50 space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    KYC Verified
                  </div>
                  <p className="text-[8px] text-slate-300 leading-tight">Your driver's license was manually reviewed and approved.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* Notice Board Component (System Updates) */}
      {publicAnnouncements.length > 0 && (
        <section className="bg-[#F0F7F2] border-b border-[#D1E6D8] py-8 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4 text-[#1A1A1A]">
              <Bell className="w-5 h-5 text-[#008751] animate-bounce" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Public Announcements</h2>
            </div>
            <div className="space-y-3">
              {publicAnnouncements.map((ann) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-5 rounded-2xl border border-[#E0E7E0] shadow-sm flex gap-4"
                >
                  <div className="w-1.5 rounded-full bg-[#008751] self-stretch"></div>
                  <div>
                    <h3 className="font-bold text-[#1A1A1A] text-base">{ann.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{ann.content}</p>
                    <span className="text-[10px] text-gray-400 mt-2 block font-mono">
                      Published: {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] tracking-tight">
            How 9ija Escrow Safeguards Your Trades
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm">
            Our platform guarantees security by keeping assets locked in a regulated multi-signature setup until payment verification is authorized by our admin specialists.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-[#E0E7E0] shadow-sm hover:shadow-md transition duration-200">
            <div className="p-3 bg-[#E6F4EA] text-[#008751] rounded-xl w-fit mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-[#1A1A1A]">Ironclad Escrow</h3>
            <p className="text-gray-500 leading-relaxed text-sm">
              Crypto assets are deposited into dedicated BSC, Tron, or Polygon wallets. They are never released to the buyer until payment is fully verified by our support line.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#E0E7E0] shadow-sm hover:shadow-md transition duration-200">
            <div className="p-3 bg-[#E6F4EA] text-[#008751] rounded-xl w-fit mb-6">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-[#1A1A1A]">Rigorous KYC Auditing</h3>
            <p className="text-gray-500 leading-relaxed text-sm">
              We require valid identity verification documents (NIN paper/plastic, Voter's Card, or Driver's license) manually checked to prevent fraud and illegal bank activities.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#E0E7E0] shadow-sm hover:shadow-md transition duration-200">
            <div className="p-3 bg-[#E6F4EA] text-[#008751] rounded-xl w-fit mb-6">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-[#1A1A1A]">Zero Slippage Guarantee</h3>
            <p className="text-gray-500 leading-relaxed text-sm">
              The rate you lock at the moment of starting an order is the exact rate of your payout. We cover standard network mining fees.
            </p>
          </div>
        </div>
      </section>

      {/* Info: Privacy Policy, Terms, Data Protection */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-6 border-t border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-b border-slate-900 pb-12">
            
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-white">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-xl font-bold tracking-wider">9IJA ESCROW</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                9ija Escrow is a secure peer-to-peer (P2P) crypto settlement portal. We facilitate seamless local bank transfers (NGN) for USDT tokens with guaranteed dispute resolution.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">How We Handle Your Data</h3>
              <p className="text-xs leading-relaxed">
                9ija Escrow takes privacy seriously. In compliance with data regulations, your KYC data (NIN details, Driver's License images, full legal names, and bank details) is encrypted and saved strictly for fraud mitigation. We do not sell or lease user information. In the event of a dispute, data can be reviewed internally.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">Terms & Conditions</h3>
              <p className="text-xs leading-relaxed">
                All P2P traders must provide legitimate screenshot proofs of payments. Providing fake screenshots, edited transaction sheets, or using third-party bank transfers to buy crypto results in immediate KYC cancellation and escrow freeze. Ensure your bank name matches your registered full legal KYC name.
              </p>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 text-xs space-y-4 sm:space-y-0">
            <div>
              &copy; {new Date().getFullYear()} 9ija Escrow Inc. All rights reserved. Registered Crypto-Service Operator.
            </div>
            <div className="flex gap-6">
              <a href="#privacy" className="hover:text-emerald-400">Privacy Policy</a>
              <a href="#terms" className="hover:text-emerald-400">Terms of Use</a>
              <a href="#support" className="hover:text-emerald-400">Merchant Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

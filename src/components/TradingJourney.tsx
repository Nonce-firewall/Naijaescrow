import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Order, UserProfile } from '../types'; // UserProfile reserved for future milestones

interface TradingJourneyProps {
  orders: Order[];
  effectiveSellRate: number;
  userProfile: UserProfile;
}

// Maximum sparkline data points kept in memory
const MAX_POINTS = 24;

// Smooth cubic bezier path from a flat array of Y values
function buildLinePath(points: number[], w: number, h: number): string {
  if (points.length < 2) return '';
  const pad = 6;
  const minV = Math.min(...points);
  const maxV = Math.max(...points);
  const range = maxV - minV || 1;
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => ({
    x: i * step,
    y: h - pad - ((v - minV) / range) * (h - pad * 2),
  }));
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const p = coords[i - 1];
    const c = coords[i];
    const mx = (p.x + c.x) / 2;
    d += ` C ${mx.toFixed(1)} ${p.y.toFixed(1)}, ${mx.toFixed(1)} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return d;
}

function buildFillPath(linePath: string, lastX: number, h: number): string {
  if (!linePath) return '';
  return `${linePath} L ${lastX.toFixed(1)} ${h} L 0 ${h} Z`;
}

function formatVolume(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// SVG dimensions (logical units — rendered responsively via viewBox)
const SVG_W = 280;
const SVG_H = 76;

export default function TradingJourney({
  orders,
  effectiveSellRate,
  // userProfile reserved for future per-user milestones
}: TradingJourneyProps) {
  // ── Sparkline data ──────────────────────────────────────────────────────────
  const [rateHistory, setRateHistory] = useState<number[]>([effectiveSellRate]);
  const prevRateRef = useRef(effectiveSellRate);

  useEffect(() => {
    if (effectiveSellRate !== prevRateRef.current) {
      prevRateRef.current = effectiveSellRate;
      setRateHistory(prev => {
        const next = [...prev, effectiveSellRate];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });
    }
  }, [effectiveSellRate]);

  // ── Stats (memoised — only changes when orders list changes) ─────────────────
  const stats = useMemo(() => {
    const completed = orders.filter(o => o.status === 'completed');
    const pending   = orders.filter(o => o.status === 'pending');
    const volume    = completed.reduce((s, o) => s + o.ngnAmount, 0);
    const rate      = orders.length ? Math.round((completed.length / orders.length) * 100) : 0;
    return { completed: completed.length, pending: pending.length, volume, rate, total: orders.length };
  }, [orders]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [orders],
  );

  // ── Sparkline geometry ───────────────────────────────────────────────────────
  const hasLine  = rateHistory.length >= 2;
  const linePath = hasLine ? buildLinePath(rateHistory, SVG_W, SVG_H) : '';
  const lastX    = hasLine ? (rateHistory.length - 1) * (SVG_W / (rateHistory.length - 1)) : 0;
  const fillPath = buildFillPath(linePath, lastX, SVG_H);

  const minV  = Math.min(...rateHistory);
  const maxV  = Math.max(...rateHistory);
  const range = maxV - minV || 1;
  const pad   = 6;
  const lastY = SVG_H - pad - ((rateHistory[rateHistory.length - 1] - minV) / range) * (SVG_H - pad * 2);

  const rateDelta = rateHistory.length >= 2
    ? rateHistory[rateHistory.length - 1] - rateHistory[0]
    : 0;
  const rateUp = rateDelta >= 0;

  return (
    <motion.div
      className="mb-5 sm:mb-8 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[#111111]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: 'easeOut', delay: 0.08 }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-0">
        <div className="flex items-center gap-2">
          {/* Live pulse dot — CSS-only, zero JS cost */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF85] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF85]" />
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-[#00FF85]">
            Trading Journey
          </span>
        </div>
        <span className="text-[10px] text-gray-600 font-mono tabular-nums">
          {stats.total} {stats.total === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {/* ── Body: sparkline + stats ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row">

        {/* Sparkline */}
        <div className="flex-1 px-4 sm:px-6 pt-3 pb-4 sm:pb-5 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-wider">
              Rate (this session)
            </span>
            {rateHistory.length >= 2 && (
              <span className={`text-[9px] font-bold font-mono tabular-nums ${rateUp ? 'text-[#00FF85]' : 'text-rose-400'}`}>
                {rateUp ? '+' : ''}{rateDelta.toLocaleString()} ₦
              </span>
            )}
          </div>

          {/* Sparkline canvas */}
          <div
            className="relative rounded-xl bg-[#0C0C0C] border border-white/[0.04] overflow-hidden"
            style={{ height: 76 }}
          >
            {hasLine ? (
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute inset-0"
              >
                <defs>
                  <linearGradient id="tj-fill-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00FF85" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#00FF85" stopOpacity="0"    />
                  </linearGradient>
                </defs>

                {/* Area fill */}
                <path d={fillPath} fill="url(#tj-fill-grad)" />

                {/* Stroke */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#00FF85"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Live dot — outer ring uses animate-pulse (opacity only → GPU) */}
                <circle cx={lastX} cy={lastY} r="5.5" fill="#00FF85" fillOpacity="0.18" className="animate-pulse" />
                <circle cx={lastX} cy={lastY} r="2.8" fill="#00FF85" />
              </svg>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] text-gray-700 font-mono tracking-wider">
                  Collecting rate data…
                </span>
              </div>
            )}

            {/* Overlay: current price label */}
            <div className="absolute bottom-1.5 left-2.5 pointer-events-none">
              <span className="text-[9px] font-mono text-[#00FF85]/50 tabular-nums">
                ₦{effectiveSellRate.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="sm:hidden h-px bg-white/[0.05] mx-4" />
        <div className="hidden sm:block w-px bg-white/[0.05] my-4" />

        {/* Stats column */}
        <div className="grid grid-cols-3 sm:grid-cols-1 sm:w-44">
          {/* Dividers between stat cells */}
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-r sm:border-r-0 sm:border-b border-white/[0.05]">
            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Done</div>
            <div className="text-xl font-bold text-white tabular-nums leading-none">{stats.completed}</div>
            <div className="text-[9px] text-gray-700 font-mono mt-1">
              {stats.rate}% success
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 sm:py-4 border-r sm:border-r-0 sm:border-b border-white/[0.05]">
            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Volume</div>
            <div className="text-xl font-bold text-white tabular-nums leading-none">
              {formatVolume(stats.volume)}
            </div>
            <div className="text-[9px] text-gray-700 font-mono mt-1">NGN traded</div>
          </div>

          <div className="px-4 sm:px-5 py-3 sm:py-4">
            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Pending</div>
            <div className={`text-xl font-bold tabular-nums leading-none ${stats.pending > 0 ? 'text-amber-400' : 'text-white'}`}>
              {stats.pending}
            </div>
            <div className="text-[9px] text-gray-700 font-mono mt-1">in progress</div>
          </div>
        </div>
      </div>

      {/* ── Recent activity ─────────────────────────────────────────────────── */}
      {recentOrders.length > 0 ? (
        <div className="border-t border-white/[0.05] px-4 sm:px-6 pt-3 pb-4">
          <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-2.5">
            Recent activity
          </div>
          <div className="flex flex-col gap-1.5">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between gap-3">
                {/* Left: type badge + coin */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 text-[8px] font-extrabold px-1.5 py-[3px] rounded uppercase tracking-wide ${
                    order.type === 'buy'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10   text-rose-400   border border-rose-500/20'
                  }`}>
                    {order.type}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono truncate">
                    {order.cryptoAmount} {order.token}
                  </span>
                  <span className="hidden sm:block text-[9px] text-gray-700 font-mono shrink-0">
                    {formatTime(order.createdAt)}
                  </span>
                </div>

                {/* Right: NGN amount + status */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-white font-mono font-semibold tabular-nums">
                    ₦{order.ngnAmount.toLocaleString()}
                  </span>
                  <span className={`text-[8px] font-bold px-1.5 py-[3px] rounded-full tabular-nums ${
                    order.status === 'completed' ? 'text-[#00FF85] bg-[#00FF85]/10' :
                    order.status === 'pending'   ? 'text-amber-400 bg-amber-400/10'  :
                                                   'text-rose-400  bg-rose-400/10'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="border-t border-white/[0.05] px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-white/[0.04]" />
            <span className="text-[9px] text-gray-700 font-mono uppercase tracking-wider">
              No trades yet — start your journey
            </span>
            <div className="h-px flex-1 bg-white/[0.04]" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

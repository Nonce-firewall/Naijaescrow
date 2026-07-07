import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Order, UserProfile } from '../types'; // UserProfile reserved for future milestones

interface TradingJourneyProps {
  orders: Order[];
  effectiveSellRate: number;
  userProfile: UserProfile;
}

// ── Forex signal path (pre-computed, 560-unit wide for seamless loop) ─────────
// Generated from multi-frequency sine/cosine blend so y(0) === y(0.5) exactly.
// The SVG is rendered at width="200%" and animated translateX(0 → -50%) via
// the .forex-signal CSS class — pure GPU, zero JS runtime cost.
const FOREX_LINE =
  'M 0.0 56.5 C 2.4 56.5, 2.4 58.3, 4.7 58.3 C 7.1 58.3, 7.1 58.9, 9.4 58.9 C 11.8 58.9, 11.8 58.6, 14.1 58.6 C 16.5 58.6, 16.5 57.4, 18.8 57.4 C 21.2 57.4, 21.2 55.7, 23.5 55.7 C 25.9 55.7, 25.9 53.6, 28.2 53.6 C 30.6 53.6, 30.6 51.5, 32.9 51.5 C 35.3 51.5, 35.3 49.6, 37.6 49.6 C 40.0 49.6, 40.0 48.0, 42.4 48.0 C 44.7 48.0, 44.7 46.9, 47.1 46.9 C 49.4 46.9, 49.4 46.3, 51.8 46.3 C 54.1 46.3, 54.1 46.0, 56.5 46.0 C 58.8 46.0, 58.8 46.0, 61.2 46.0 C 63.5 46.0, 63.5 46.2, 65.9 46.2 C 68.2 46.2, 68.2 46.3, 70.6 46.3 C 72.9 46.3, 72.9 46.2, 75.3 46.2 C 77.6 46.2, 77.6 45.9, 80.0 45.9 C 82.4 45.9, 82.4 45.4, 84.7 45.4 C 87.1 45.4, 87.1 44.5, 89.4 44.5 C 91.8 44.5, 91.8 43.6, 94.1 43.6 C 96.5 43.6, 96.5 42.5, 98.8 42.5 C 101.2 42.5, 101.2 41.5, 103.5 41.5 C 105.9 41.5, 105.9 40.6, 108.2 40.6 C 110.6 40.6, 110.6 39.9, 112.9 39.9 C 115.3 39.9, 115.3 39.4, 117.6 39.4 C 120.0 39.4, 120.0 39.1, 122.4 39.1 C 124.7 39.1, 124.7 38.9, 127.1 38.9 C 129.4 38.9, 129.4 38.9, 131.8 38.9 C 134.1 38.9, 134.1 38.7, 136.5 38.7 C 138.8 38.7, 138.8 38.5, 141.2 38.5 C 143.5 38.5, 143.5 38.0, 145.9 38.0 C 148.2 38.0, 148.2 37.3, 150.6 37.3 C 152.9 37.3, 152.9 36.3, 155.3 36.3 C 157.6 36.3, 157.6 35.1, 160.0 35.1 C 162.4 35.1, 162.4 33.7, 164.7 33.7 C 167.1 33.7, 167.1 32.1, 169.4 32.1 C 171.8 32.1, 171.8 30.4, 174.1 30.4 C 176.5 30.4, 176.5 28.7, 178.8 28.7 C 181.2 28.7, 181.2 26.9, 183.5 26.9 C 185.9 26.9, 185.9 25.1, 188.2 25.1 C 190.6 25.1, 190.6 23.3, 192.9 23.3 C 195.3 23.3, 195.3 21.5, 197.6 21.5 C 200.0 21.5, 200.0 19.8, 202.4 19.8 C 204.7 19.8, 204.7 18.2, 207.1 18.2 C 209.4 18.2, 209.4 16.7, 211.8 16.7 C 214.1 16.7, 214.1 15.6, 216.5 15.6 C 218.8 15.6, 218.8 15.0, 221.2 15.0 C 223.5 15.0, 223.5 15.0, 225.9 15.0 C 228.2 15.0, 228.2 15.7, 230.6 15.7 C 232.9 15.7, 232.9 17.3, 235.3 17.3 C 237.6 17.3, 237.6 19.9, 240.0 19.9 C 242.4 19.9, 242.4 23.3, 244.7 23.3 C 247.1 23.3, 247.1 27.6, 249.4 27.6 C 251.8 27.6, 251.8 32.4, 254.1 32.4 C 256.5 32.4, 256.5 37.5, 258.8 37.5 C 261.2 37.5, 261.2 42.7, 263.5 42.7 C 265.9 42.7, 265.9 47.6, 268.2 47.6 C 270.6 47.6, 270.6 51.8, 272.9 51.8 C 275.3 51.8, 275.3 55.2, 277.6 55.2 C 280.0 55.2, 280.0 57.5, 282.4 57.5 C 284.7 57.5, 284.7 58.7, 287.1 58.7 C 289.4 58.7, 289.4 58.9, 291.8 58.9 C 294.1 58.9, 294.1 58.1, 296.5 58.1 C 298.8 58.1, 298.8 56.6, 301.2 56.6 C 303.5 56.6, 303.5 54.7, 305.9 54.7 C 308.2 54.7, 308.2 52.5, 310.6 52.5 C 312.9 52.5, 312.9 50.5, 315.3 50.5 C 317.6 50.5, 317.6 48.7, 320.0 48.7 C 322.4 48.7, 322.4 47.4, 324.7 47.4 C 327.1 47.4, 327.1 46.5, 329.4 46.5 C 331.8 46.5, 331.8 46.1, 334.1 46.1 C 336.5 46.1, 336.5 46.0, 338.8 46.0 C 341.2 46.0, 341.2 46.1, 343.5 46.1 C 345.9 46.1, 345.9 46.2, 348.2 46.2 C 350.6 46.2, 350.6 46.3, 352.9 46.3 C 355.3 46.3, 355.3 46.1, 357.6 46.1 C 360.0 46.1, 360.0 45.7, 362.4 45.7 C 364.7 45.7, 364.7 45.0, 367.1 45.0 C 369.4 45.0, 369.4 44.1, 371.8 44.1 C 374.1 44.1, 374.1 43.0, 376.5 43.0 C 378.8 43.0, 378.8 42.0, 381.2 42.0 C 383.5 42.0, 383.5 41.0, 385.9 41.0 C 388.2 41.0, 388.2 40.2, 390.6 40.2 C 392.9 40.2, 392.9 39.6, 395.3 39.6 C 397.6 39.6, 397.6 39.2, 400.0 39.2 C 402.4 39.2, 402.4 39.0, 404.7 39.0 C 407.1 39.0, 407.1 38.9, 409.4 38.9 C 411.8 38.9, 411.8 38.8, 414.1 38.8 C 416.5 38.8, 416.5 38.6, 418.8 38.6 C 421.2 38.6, 421.2 38.3, 423.5 38.3 C 425.9 38.3, 425.9 37.7, 428.2 37.7 C 430.6 37.7, 430.6 36.9, 432.9 36.9 C 435.3 36.9, 435.3 35.8, 437.6 35.8 C 440.0 35.8, 440.0 34.4, 442.4 34.4 C 444.7 34.4, 444.7 32.9, 447.1 32.9 C 449.4 32.9, 449.4 31.3, 451.8 31.3 C 454.1 31.3, 454.1 29.5, 456.5 29.5 C 458.8 29.5, 458.8 27.8, 461.2 27.8 C 463.5 27.8, 463.5 26.0, 465.9 26.0 C 468.2 26.0, 468.2 24.2, 470.6 24.2 C 472.9 24.2, 472.9 22.4, 475.3 22.4 C 477.6 22.4, 477.6 20.6, 480.0 20.6 C 482.4 20.6, 482.4 18.9, 484.7 18.9 C 487.1 18.9, 487.1 17.4, 489.4 17.4 C 491.8 17.4, 491.8 16.1, 494.1 16.1 C 496.5 16.1, 496.5 15.2, 498.8 15.2 C 501.2 15.2, 501.2 14.9, 503.5 14.9 C 505.9 14.9, 505.9 15.2, 508.2 15.2 C 510.6 15.2, 510.6 16.4, 512.9 16.4 C 515.3 16.4, 515.3 18.5, 517.6 18.5 C 520.0 18.5, 520.0 21.5, 522.4 21.5 C 524.7 21.5, 524.7 25.4, 527.1 25.4 C 529.4 25.4, 529.4 29.9, 531.8 29.9 C 534.1 29.9, 534.1 34.9, 536.5 34.9 C 538.8 34.9, 538.8 40.1, 541.2 40.1 C 543.5 40.1, 543.5 45.2, 545.9 45.2 C 548.2 45.2, 548.2 49.8, 550.6 49.8 C 552.9 49.8, 552.9 53.6, 555.3 53.6 C 557.6 53.6, 557.6 56.5, 560.0 56.5';

const FOREX_FILL = FOREX_LINE + ' L 560 76 L 0 76 Z';

// ── Sparkline helpers ─────────────────────────────────────────────────────────
const MAX_POINTS = 24;
const SVG_W = 280;
const SVG_H = 76;

function buildLinePath(pts: number[], w: number, h: number): string {
  if (pts.length < 2) return '';
  const pad = 6;
  const minV = Math.min(...pts);
  const maxV = Math.max(...pts);
  const range = maxV - minV || 1;
  const step = w / (pts.length - 1);
  const coords = pts.map((v, i) => ({
    x: i * step,
    y: h - pad - ((v - minV) / range) * (h - pad * 2),
  }));
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const p = coords[i - 1], c = coords[i];
    const mx = ((p.x + c.x) / 2).toFixed(1);
    d += ` C ${mx} ${p.y.toFixed(1)}, ${mx} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return d;
}

function formatVolume(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TradingJourney({
  orders,
  effectiveSellRate,
  // userProfile reserved for future per-user milestones
}: TradingJourneyProps) {

  // Sparkline — event-driven, only updates when live rate changes (every 5 min)
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

  // Stats — only recomputes when orders change
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

  // Sparkline geometry — derived when we have ≥2 real data points
  const hasLine = rateHistory.length >= 2;
  const linePath = hasLine ? buildLinePath(rateHistory, SVG_W, SVG_H) : '';
  const lastX    = hasLine ? (rateHistory.length - 1) * (SVG_W / (rateHistory.length - 1)) : 0;
  const fillPath = hasLine ? `${linePath} L ${lastX.toFixed(1)} ${SVG_H} L 0 ${SVG_H} Z` : '';

  const minV  = Math.min(...rateHistory);
  const maxV  = Math.max(...rateHistory);
  const pad   = 6;
  const lastY = SVG_H - pad - ((rateHistory[rateHistory.length - 1] - minV) / (maxV - minV || 1)) * (SVG_H - pad * 2);

  const rateDelta = hasLine ? rateHistory[rateHistory.length - 1] - rateHistory[0] : 0;
  const rateUp    = rateDelta >= 0;

  return (
    <motion.div
      className="mb-5 sm:mb-8 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[#111111]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: 'easeOut', delay: 0.08 }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-3.5 sm:pt-5 pb-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF85] opacity-60" />
            <span className="relative inline-flex rounded-full h-full w-full bg-[#00FF85]" />
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-[#00FF85]">
            Trading Journey
          </span>
        </div>
        <span className="text-[9px] sm:text-[10px] text-gray-600 font-mono tabular-nums">
          {stats.total} {stats.total === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {/* ── Body: chart + stats ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row">

        {/* Chart area */}
        <div className="flex-1 px-3 sm:px-6 pt-2.5 sm:pt-3 pb-3 sm:pb-5 min-w-0">

          {/* Chart canvas */}
          <div className="relative rounded-xl bg-[#0A0A0A] border border-white/[0.04] overflow-hidden h-[64px] sm:h-[80px]">

            {/* ── Animated forex signal — CSS translateX, pure GPU ───────── */}
            {/* SVG is 200% wide; .forex-signal animates it left by -50% of
                its own width = -100% of container = one seamless loop      */}
            <svg
              className="absolute inset-0 top-0 left-0 forex-signal"
              width="200%"
              height="100%"
              viewBox="0 0 560 76"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ opacity: hasLine ? 0.22 : 0.45 }}
            >
              <defs>
                <linearGradient id="tj-fx-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00FF85" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#00FF85" stopOpacity="0"    />
                </linearGradient>
              </defs>
              <path d={FOREX_FILL} fill="url(#tj-fx-fill)" />
              <path
                d={FOREX_LINE}
                fill="none"
                stroke="#00FF85"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>

            {/* ── Real sparkline overlay (when ≥2 rate samples exist) ─────── */}
            {hasLine && (
              <svg
                className="absolute inset-0"
                width="100%"
                height="100%"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="tj-real-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00FF85" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#00FF85" stopOpacity="0"    />
                  </linearGradient>
                </defs>
                <path d={fillPath}  fill="url(#tj-real-fill)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#00FF85"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Live dot */}
                <circle cx={lastX} cy={lastY} r="5"   fill="#00FF85" fillOpacity="0.2" className="animate-pulse" />
                <circle cx={lastX} cy={lastY} r="2.6" fill="#00FF85" />
              </svg>
            )}

            {/* Subtle horizontal grid lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-[10px]">
              <div className="h-px bg-white/[0.035]" />
              <div className="h-px bg-white/[0.035]" />
              <div className="h-px bg-white/[0.035]" />
            </div>

            {/* Rate label — bottom left */}
            <div className="absolute bottom-1.5 left-2.5 pointer-events-none">
              <span className="text-[9px] font-mono text-[#00FF85]/55 tabular-nums">
                ₦{effectiveSellRate.toLocaleString()}
              </span>
            </div>

            {/* Delta label — bottom right (only when real data exists) */}
            {hasLine && (
              <div className="absolute bottom-1.5 right-2.5 pointer-events-none">
                <span className={`text-[9px] font-bold font-mono tabular-nums ${rateUp ? 'text-[#00FF85]' : 'text-rose-400'}`}>
                  {rateUp ? '▲' : '▼'} {Math.abs(rateDelta).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Vertical divider (desktop only) */}
        <div className="hidden sm:block w-px bg-white/[0.05] my-3.5" />
        {/* Horizontal divider (mobile only) */}
        <div className="sm:hidden h-px bg-white/[0.05] mx-3" />

        {/* Stats — 3-col on mobile, 1-col on desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-1 sm:w-40">
          <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-r sm:border-r-0 sm:border-b border-white/[0.05]">
            <div className="text-[8px] sm:text-[9px] text-gray-600 uppercase tracking-wider mb-0.5 sm:mb-1">Done</div>
            <div className="text-base sm:text-xl font-bold text-white tabular-nums leading-none">{stats.completed}</div>
            <div className="text-[8px] text-gray-700 font-mono mt-0.5 sm:mt-1">{stats.rate}% success</div>
          </div>

          <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-r sm:border-r-0 sm:border-b border-white/[0.05]">
            <div className="text-[8px] sm:text-[9px] text-gray-600 uppercase tracking-wider mb-0.5 sm:mb-1">Volume</div>
            <div className="text-base sm:text-xl font-bold text-white tabular-nums leading-none">{formatVolume(stats.volume)}</div>
            <div className="text-[8px] text-gray-700 font-mono mt-0.5 sm:mt-1">NGN</div>
          </div>

          <div className="px-3 sm:px-5 py-2.5 sm:py-3.5">
            <div className="text-[8px] sm:text-[9px] text-gray-600 uppercase tracking-wider mb-0.5 sm:mb-1">Pending</div>
            <div className={`text-base sm:text-xl font-bold tabular-nums leading-none ${stats.pending > 0 ? 'text-amber-400' : 'text-white'}`}>
              {stats.pending}
            </div>
            <div className="text-[8px] text-gray-700 font-mono mt-0.5 sm:mt-1">active</div>
          </div>
        </div>
      </div>

      {/* ── Recent activity ─────────────────────────────────────────────────── */}
      {recentOrders.length > 0 ? (
        <div className="border-t border-white/[0.05] px-3 sm:px-6 pt-2.5 sm:pt-3 pb-3 sm:pb-4">
          <div className="text-[8px] sm:text-[9px] text-gray-600 uppercase tracking-wider mb-2">
            Recent activity
          </div>
          <div className="flex flex-col gap-1.5">
            {recentOrders.map((order, idx) => (
              // On mobile hide the 3rd row to keep the card compact
              <div
                key={order.id}
                className={`flex items-center justify-between gap-2 ${idx === 2 ? 'hidden sm:flex' : ''}`}
              >
                {/* Left */}
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
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

                {/* Right */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="text-[10px] text-white font-mono font-semibold tabular-nums">
                    ₦{order.ngnAmount.toLocaleString()}
                  </span>
                  <span className={`text-[8px] font-bold px-1.5 py-[3px] rounded-full ${
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
        <div className="border-t border-white/[0.05] px-4 sm:px-6 py-3">
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

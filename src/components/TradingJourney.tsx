import React, { memo, useId, useMemo } from 'react';
import { motion } from 'motion/react';
import { Order, UserProfile } from '../types'; // UserProfile reserved for future milestones

interface TradingJourneyProps {
  orders: Order[];
  effectiveBuyRate: number;
  effectiveSellRate: number;
  userProfile: UserProfile;
}

// ── SVG chart constants ───────────────────────────────────────────────────────
const W       = 280;  // logical viewBox width  (scales to 100% via width="100%")
const H_TOTAL = 120;  // logical viewBox height for the unified chart
const PAD     = 6;    // inner padding so strokes don't clip at edges

// BUY series: upper 50% of chart; SELL: lower 50%, reaching the very bottom edge
// BUY_Y_MAX pushed to 50% so the green zone gets symmetric height to SELL
const BUY_Y_MIN  = PAD;
const BUY_Y_MAX  = H_TOTAL * 0.50;
const SELL_Y_MIN = H_TOTAL * 0.55;
const SELL_Y_MAX = H_TOTAL;

interface SeriesResult {
  line: string;
  fill: string;
  firstPt: { x: number; y: number } | null;
  lastPt:  { x: number; y: number } | null;
}

// ── Build smooth bezier line + fill path for a series within a Y zone.
//    fillClosesAt: y=0 for BUY (fill flows to top), y=H_TOTAL for SELL (fill flows to bottom)
// ─────────────────────────────────────────────────────────────────────────────
function buildSeriesPaths(
  seriesOrders: Order[],
  yMin: number,
  yMax: number,
  fillClosesAt: number,
  flatDirection: 'up' | 'down',   // direction of the S-curve when all rates are identical
): SeriesResult {
  if (seriesOrders.length === 0) return { line: '', fill: '', firstPt: null, lastPt: null };

  const sorted = [...seriesOrders].sort((a, b) => a.createdAt - b.createdAt);

  const rates     = sorted.map(o => o.rate);
  const rateMin   = Math.min(...rates);
  const rateMax   = Math.max(...rates);
  const rateRange = rateMax - rateMin;

  const times     = sorted.map(o => o.createdAt);
  const timeMin   = times[0];
  const timeMax   = times[times.length - 1];
  const timeRange = timeMax - timeMin;

  const xRange = W - PAD * 2;
  const yRange = yMax - yMin;

  // Higher rate → closer to yMin (top of zone).
  const toCoord = (o: Order) => ({
    x: timeRange === 0
      ? W / 2
      : PAD + ((o.createdAt - timeMin) / timeRange) * xRange,
    y: yMax - ((o.rate - rateMin) / rateRange) * yRange,
  });

  let line: string;
  let firstPt: { x: number; y: number };
  let lastPt:  { x: number; y: number };

  if (rateRange === 0 || timeRange === 0 || sorted.length === 1) {
    // All orders at the same rate (or only one order / all same timestamp).
    // Instead of a flat horizontal line, generate a smooth S-curve in the
    // direction that reflects this series' typical market direction:
    //   BUY  flatDirection='up'   → curves from bottom of zone → top
    //   SELL flatDirection='down' → curves from top of zone    → bottom
    const yStart = flatDirection === 'up'   ? yMax : yMin;
    const yEnd   = flatDirection === 'up'   ? yMin : yMax;
    const cp1x   = (PAD + xRange * 0.38).toFixed(1);
    const cp2x   = (PAD + xRange * 0.62).toFixed(1);
    line    = `M ${PAD} ${yStart.toFixed(1)} C ${cp1x} ${yStart.toFixed(1)}, ${cp2x} ${yEnd.toFixed(1)}, ${(W - PAD).toFixed(1)} ${yEnd.toFixed(1)}`;
    firstPt = { x: PAD,     y: yStart };
    lastPt  = { x: W - PAD, y: yEnd   };
  } else {
    const coords = sorted.map(toCoord);
    line = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const p = coords[i - 1], c = coords[i];
      const mx = ((p.x + c.x) / 2).toFixed(1);
      line += ` C ${mx} ${p.y.toFixed(1)}, ${mx} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    }
    firstPt = coords[0];
    lastPt  = coords[coords.length - 1];
  }

  const fill = `${line} L ${lastPt.x.toFixed(1)} ${fillClosesAt} L ${firstPt.x.toFixed(1)} ${fillClosesAt} Z`;

  return { line, fill, firstPt, lastPt };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Unified chart (single SVG, BUY upper zone + SELL lower zone) ──────────────
interface UnifiedChartProps {
  buyLine: string;
  buyFill: string;
  buyLastPt:  { x: number; y: number } | null;
  sellLine: string;
  sellFill: string;
  sellLastPt:  { x: number; y: number } | null;
  buyGradId: string;
  sellGradId: string;
  buyEmpty: boolean;
  sellEmpty: boolean;
  effectiveBuyRate: number;
  effectiveSellRate: number;
}

const UnifiedChart = memo(function UnifiedChart({
  buyLine, buyFill, buyLastPt,
  sellLine, sellFill, sellLastPt,
  buyGradId, sellGradId,
  buyEmpty, sellEmpty,
  effectiveBuyRate, effectiveSellRate,
}: UnifiedChartProps) {
  // BUY gradient: faint at top edge (y=0), grows opaque toward the line (y=1 direction)
  // SELL gradient: opaque near the line (y=0 direction), faint toward bottom edge (y=1)
  return (
    <div className="relative w-full h-full">
      <svg
        className="absolute inset-0"
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H_TOTAL}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          {/* BUY fill: transparent at top edge, opaque near the line */}
          <linearGradient id={buyGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#10B981" stopOpacity={0.04} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0.35} />
          </linearGradient>
          {/* SELL fill: opaque near the line, retains a faint tint at the bottom edge */}
          <linearGradient id={sellGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#F43F5E" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.10} />
          </linearGradient>
        </defs>

        {/* Subtle horizontal grid lines across full height */}
        {[0.25, 0.5, 0.75].map(f => (
          <line
            key={f}
            x1={0} y1={H_TOTAL * f} x2={W} y2={H_TOTAL * f}
            stroke="white"
            strokeOpacity={0.03}
            strokeWidth="1"
          />
        ))}

        {/* ── BUY series ── */}
        {!buyEmpty && buyFill  && <path d={buyFill}  fill={`url(#${buyGradId})`} />}
        {!buyEmpty && buyLine  && (
          <path
            d={buyLine}
            fill="none"
            stroke="#10B981"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {!buyEmpty && buyLastPt && (
          // Outer glow ring — static (no CSS animation to avoid continuous repaints)
          <>
            <circle cx={buyLastPt.x} cy={buyLastPt.y} r="5" fill="#10B981" fillOpacity="0.15" />
            <circle cx={buyLastPt.x} cy={buyLastPt.y} r="2.2" fill="#10B981" />
          </>
        )}

        {/* ── SELL series ── */}
        {!sellEmpty && sellFill  && <path d={sellFill}  fill={`url(#${sellGradId})`} />}
        {!sellEmpty && sellLine  && (
          <path
            d={sellLine}
            fill="none"
            stroke="#F43F5E"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {!sellEmpty && sellLastPt && (
          <>
            <circle cx={sellLastPt.x} cy={sellLastPt.y} r="5" fill="#F43F5E" fillOpacity="0.15" />
            <circle cx={sellLastPt.x} cy={sellLastPt.y} r="2.2" fill="#F43F5E" />
          </>
        )}
      </svg>

      {/* BUY label — top-left */}
      <span className="absolute top-1.5 left-2.5 text-[8px] font-mono font-bold tracking-widest pointer-events-none text-[#10B981]/60">
        BUY
      </span>

      {/* BUY effective rate — top-right (green) */}
      <span className="absolute top-1.5 right-2.5 text-[8px] font-mono tabular-nums pointer-events-none text-[#10B981]/60">
        ₦{effectiveBuyRate.toLocaleString()}
      </span>

      {/* SELL label — bottom-left */}
      <span className="absolute bottom-1.5 left-2.5 text-[8px] font-mono font-bold tracking-widest pointer-events-none text-[#F43F5E]/60">
        SELL
      </span>

      {/* SELL effective rate — bottom-right (red) */}
      <span className="absolute bottom-1.5 right-2.5 text-[8px] font-mono tabular-nums pointer-events-none text-[#F43F5E]/60">
        ₦{effectiveSellRate.toLocaleString()}
      </span>

      {/* Empty state hints */}
      {buyEmpty && (
        <div className="absolute flex items-center justify-center pointer-events-none"
          style={{ top: `${BUY_Y_MIN / H_TOTAL * 100}%`, height: `${(BUY_Y_MAX - BUY_Y_MIN) / H_TOTAL * 100}%`, left: 0, right: 0 }}>
          <span className="text-[8px] text-gray-800 font-mono uppercase tracking-widest">no buy trades yet</span>
        </div>
      )}
      {sellEmpty && (
        <div className="absolute flex items-center justify-center pointer-events-none"
          style={{ top: `${SELL_Y_MIN / H_TOTAL * 100}%`, height: `${(SELL_Y_MAX - SELL_Y_MIN) / H_TOTAL * 100}%`, left: 0, right: 0 }}>
          <span className="text-[8px] text-gray-800 font-mono uppercase tracking-widest">no sell trades yet</span>
        </div>
      )}
    </div>
  );
});

// ── Component ─────────────────────────────────────────────────────────────────
export default function TradingJourney({
  orders,
  effectiveBuyRate,
  effectiveSellRate,
}: TradingJourneyProps) {

  // useId ensures gradient IDs are unique even if multiple instances render
  const uid = useId();
  const buyGradId  = `tj-buy-${uid}`;
  const sellGradId = `tj-sell-${uid}`;

  const completedOrders = useMemo(
    () => orders.filter(o => o.status === 'completed').sort((a, b) => a.createdAt - b.createdAt),
    [orders],
  );

  const buyOrders  = useMemo(() => completedOrders.filter(o => o.type === 'buy'),  [completedOrders]);
  const sellOrders = useMemo(() => completedOrders.filter(o => o.type === 'sell'), [completedOrders]);

  // BUY: upper zone, fill closes at y=0 (top edge), S-curve goes up when rates are flat
  // SELL: lower zone, fill closes at y=H_TOTAL (bottom edge), S-curve goes down when flat
  const buy  = useMemo(() => buildSeriesPaths(buyOrders,  BUY_Y_MIN,  BUY_Y_MAX,  0,       'up'),   [buyOrders]);
  const sell = useMemo(() => buildSeriesPaths(sellOrders, SELL_Y_MIN, SELL_Y_MAX, H_TOTAL, 'down'), [sellOrders]);

  const stats = useMemo(() => {
    const volume = completedOrders.reduce((s, o) => s + o.ngnAmount, 0);
    const rate   = orders.length ? Math.round((completedOrders.length / orders.length) * 100) : 0;
    return {
      completed: completedOrders.length,
      buyCount:  buyOrders.length,
      sellCount: sellOrders.length,
      volume,
      rate,
    };
  }, [orders, completedOrders, buyOrders, sellOrders]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [orders],
  );

  return (
    <motion.div
      className="mb-5 sm:mb-8 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[#111111]"
      style={{ contain: 'layout style paint' }}
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
        {/* Buy / Sell mini legend */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono font-bold">
            <span className="w-4 h-[2px] bg-emerald-500 rounded-full inline-block" />
            BUY
          </span>
          <span className="flex items-center gap-1 text-[9px] text-rose-400 font-mono font-bold">
            <span className="w-4 h-[2px] bg-rose-500 rounded-full inline-block" />
            SELL
          </span>
        </div>
      </div>

      {/* ── Body: split chart + stats ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row">

        {/* Unified chart area — BUY (upper zone) + SELL (lower zone) in one SVG */}
        <div className="flex-1 flex flex-col px-3 sm:px-6 pt-2.5 sm:pt-3 pb-3 sm:pb-5 min-w-0">
          <div
            className="relative flex-1 min-h-[120px] rounded-xl bg-[#0A0A0A] border border-white/[0.04] overflow-hidden"
          >
            <UnifiedChart
              buyLine={buy.line}
              buyFill={buy.fill}
              buyLastPt={buy.lastPt}
              sellLine={sell.line}
              sellFill={sell.fill}
              sellLastPt={sell.lastPt}
              buyGradId={buyGradId}
              sellGradId={sellGradId}
              buyEmpty={buyOrders.length === 0}
              sellEmpty={sellOrders.length === 0}
              effectiveBuyRate={effectiveBuyRate}
              effectiveSellRate={effectiveSellRate}
            />
          </div>
        </div>

        {/* Dividers */}
        <div className="hidden sm:block w-px bg-white/[0.05] my-3.5" />
        <div className="sm:hidden h-px bg-white/[0.05] mx-3" />

        {/* Stats ── 3-col on mobile, 1-col on desktop */}
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
            <div className="text-[8px] sm:text-[9px] text-gray-600 uppercase tracking-wider mb-0.5 sm:mb-1">Split</div>
            <div className="text-base sm:text-xl font-bold text-white tabular-nums leading-none flex items-baseline gap-1">
              <span className="text-emerald-400">{stats.buyCount}</span>
              <span className="text-gray-700 text-xs">/</span>
              <span className="text-rose-400">{stats.sellCount}</span>
            </div>
            <div className="text-[8px] text-gray-700 font-mono mt-0.5 sm:mt-1">buy / sell</div>
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
              <div
                key={order.id}
                className={`flex items-center justify-between gap-2 ${idx === 2 ? 'hidden sm:flex' : ''}`}
              >
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

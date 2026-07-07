import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Order, UserProfile } from '../types'; // UserProfile reserved for future milestones

interface TradingJourneyProps {
  orders: Order[];
  effectiveSellRate: number;
  userProfile: UserProfile;
}

// ── SVG chart constants ───────────────────────────────────────────────────────
const W   = 280;  // logical viewBox width  (scales to 100% via width="100%")
const H   = 76;   // logical viewBox height
const PAD = 7;    // inner padding so strokes don't clip at edges

// ── Build a smooth bezier line + closed fill path from an ordered set of
//    trade data points.  Y axis = NGN/USDT rate; X axis = time.
// ─────────────────────────────────────────────────────────────────────────────
function buildSeriesPaths(
  seriesOrders: Order[],
  rateMin: number,
  rateRange: number,
  timeMin: number,
  timeRange: number,
): { line: string; fill: string; lastPt: { x: number; y: number } | null } {
  if (seriesOrders.length === 0) return { line: '', fill: '', lastPt: null };

  const xRange = W - PAD * 2;
  const yRange = H - PAD * 2;

  const toCoord = (o: Order) => ({
    x: timeRange === 0
      ? W / 2
      : PAD + ((o.createdAt - timeMin) / timeRange) * xRange,
    y: H - PAD - ((o.rate - rateMin) / (rateRange || 1)) * yRange,
  });

  const coords = seriesOrders.map(toCoord);

  let line: string;

  if (coords.length === 1) {
    // Single trade → flat horizontal line at that rate level
    line = `M ${PAD} ${coords[0].y.toFixed(1)} L ${(W - PAD).toFixed(1)} ${coords[0].y.toFixed(1)}`;
  } else {
    line = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const p = coords[i - 1], c = coords[i];
      const mx = ((p.x + c.x) / 2).toFixed(1);
      line += ` C ${mx} ${p.y.toFixed(1)}, ${mx} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    }
  }

  const first = coords[0];
  const last  = coords[coords.length - 1];

  const fill = `${line} L ${last.x.toFixed(1)} ${H} L ${first.x.toFixed(1)} ${H} Z`;

  return { line, fill, lastPt: { x: last.x, y: last.y } };
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function TradingJourney({
  orders,
  effectiveSellRate,
}: TradingJourneyProps) {

  // Only completed orders carry real rate data worth plotting
  const completedOrders = useMemo(
    () => orders.filter(o => o.status === 'completed').sort((a, b) => a.createdAt - b.createdAt),
    [orders],
  );

  const buyOrders  = useMemo(() => completedOrders.filter(o => o.type === 'buy'),  [completedOrders]);
  const sellOrders = useMemo(() => completedOrders.filter(o => o.type === 'sell'), [completedOrders]);

  // Shared Y scale — both series use the same rate min/max so they're comparable
  const allRates  = useMemo(() => completedOrders.map(o => o.rate), [completedOrders]);
  const rateMin   = allRates.length ? Math.min(...allRates) : 0;
  const rateMax   = allRates.length ? Math.max(...allRates) : 1;
  const rateRange = rateMax - rateMin;

  // Shared X scale — full time span of completed orders
  const timeMin   = completedOrders.length ? completedOrders[0].createdAt                               : 0;
  const timeMax   = completedOrders.length ? completedOrders[completedOrders.length - 1].createdAt : 1;
  const timeRange = timeMax - timeMin;

  // Build series paths (memoised — recalculates only when completedOrders changes)
  const buy  = useMemo(() => buildSeriesPaths(buyOrders,  rateMin, rateRange, timeMin, timeRange), [buyOrders,  rateMin, rateRange, timeMin, timeRange]);
  const sell = useMemo(() => buildSeriesPaths(sellOrders, rateMin, rateRange, timeMin, timeRange), [sellOrders, rateMin, rateRange, timeMin, timeRange]);

  const hasChart = completedOrders.length > 0;

  // Overall stats
  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending');
    const volume  = completedOrders.reduce((s, o) => s + o.ngnAmount, 0);
    const rate    = orders.length ? Math.round((completedOrders.length / orders.length) * 100) : 0;
    return {
      completed: completedOrders.length,
      pending:   pending.length,
      buyCount:  buyOrders.length,
      sellCount: sellOrders.length,
      volume,
      rate,
      total: orders.length,
    };
  }, [orders, completedOrders, buyOrders, sellOrders]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [orders],
  );

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

      {/* ── Body: chart + stats ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row">

        {/* Chart area */}
        <div className="flex-1 px-3 sm:px-6 pt-2.5 sm:pt-3 pb-3 sm:pb-5 min-w-0">

          <div className="relative rounded-xl bg-[#0A0A0A] border border-white/[0.04] overflow-hidden h-[68px] sm:h-[84px]">

            {hasChart ? (
              <svg
                className="absolute inset-0"
                width="100%"
                height="100%"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  {/* Green gradient fill — BUY trades */}
                  <linearGradient id="tj-buy-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10B981" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0"    />
                  </linearGradient>
                  {/* Red gradient fill — SELL trades */}
                  <linearGradient id="tj-sell-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#F43F5E" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0"    />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal grid lines */}
                {[0.25, 0.5, 0.75].map(f => (
                  <line
                    key={f}
                    x1={0} y1={H * f} x2={W} y2={H * f}
                    stroke="white" strokeOpacity="0.04" strokeWidth="1"
                  />
                ))}

                {/* ── BUY series (green) ─────────────────────────────────── */}
                {buy.fill && (
                  <path d={buy.fill} fill="url(#tj-buy-fill)" />
                )}
                {buy.line && (
                  <path
                    d={buy.line}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {buy.lastPt && (
                  <>
                    <circle cx={buy.lastPt.x} cy={buy.lastPt.y} r="4.5" fill="#10B981" fillOpacity="0.2" className="animate-pulse" />
                    <circle cx={buy.lastPt.x} cy={buy.lastPt.y} r="2.5" fill="#10B981" />
                  </>
                )}

                {/* ── SELL series (red) ──────────────────────────────────── */}
                {sell.fill && (
                  <path d={sell.fill} fill="url(#tj-sell-fill)" />
                )}
                {sell.line && (
                  <path
                    d={sell.line}
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {sell.lastPt && (
                  <>
                    <circle cx={sell.lastPt.x} cy={sell.lastPt.y} r="4.5" fill="#F43F5E" fillOpacity="0.2" className="animate-pulse" />
                    <circle cx={sell.lastPt.x} cy={sell.lastPt.y} r="2.5" fill="#F43F5E" />
                  </>
                )}
              </svg>
            ) : (
              /* Empty state — clean grid, no misleading animation */
              <svg
                className="absolute inset-0"
                width="100%"
                height="100%"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {[0.25, 0.5, 0.75].map(f => (
                  <line
                    key={f}
                    x1={0} y1={H * f} x2={W} y2={H * f}
                    stroke="white" strokeOpacity="0.05" strokeWidth="1"
                    strokeDasharray="4 6"
                  />
                ))}
              </svg>
            )}

            {/* Rate label */}
            <div className="absolute bottom-1.5 left-2.5 pointer-events-none">
              <span className="text-[9px] font-mono text-[#00FF85]/55 tabular-nums">
                ₦{effectiveSellRate.toLocaleString()}
              </span>
            </div>

            {/* Empty state label */}
            {!hasChart && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[9px] text-gray-700 font-mono uppercase tracking-widest">
                  Complete a trade to build your chart
                </span>
              </div>
            )}
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

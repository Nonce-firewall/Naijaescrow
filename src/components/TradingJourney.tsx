import React, { useId, useMemo } from 'react';
import { motion } from 'motion/react';
import { Order, UserProfile } from '../types'; // UserProfile reserved for future milestones

interface TradingJourneyProps {
  orders: Order[];
  effectiveSellRate: number;
  userProfile: UserProfile;
}

// ── SVG chart constants ───────────────────────────────────────────────────────
const W   = 280;  // logical viewBox width  (scales to 100% via width="100%")
const H   = 60;   // logical viewBox height per panel
const PAD = 6;    // inner padding so strokes don't clip at edges

interface SeriesResult {
  line: string;
  fill: string;
  lastPt: { x: number; y: number } | null;
}

// ── Build a smooth bezier line + fill path for a single series.
//    fillToTop=false → BUY panel: fill closes at y=H (downward toward divider)
//    fillToTop=true  → SELL panel: fill closes at y=0 (upward toward divider)
//
//    Each series uses its own independent Y scale so the full panel height
//    is utilised regardless of how many trades the other side has.
// ─────────────────────────────────────────────────────────────────────────────
function buildSeriesPaths(seriesOrders: Order[], fillToTop: boolean): SeriesResult {
  if (seriesOrders.length === 0) return { line: '', fill: '', lastPt: null };

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
  const yRange = H - PAD * 2;

  const toCoord = (o: Order) => ({
    x: timeRange === 0
      ? W / 2
      : PAD + ((o.createdAt - timeMin) / timeRange) * xRange,
    y: H - PAD - ((o.rate - rateMin) / (rateRange || 1)) * yRange,
  });

  const coords = sorted.map(toCoord);

  let line: string;
  // firstPt / lastPt track the actual *visual* endpoints of the drawn line
  // (may differ from coords[0]/last for the single-point case)
  let firstPt: { x: number; y: number };
  let lastPt: { x: number; y: number };

  if (coords.length === 1) {
    // Single trade → flat horizontal line spanning the full panel width
    const midY = H / 2;
    line = `M ${PAD} ${midY.toFixed(1)} L ${(W - PAD).toFixed(1)} ${midY.toFixed(1)}`;
    firstPt = { x: PAD,     y: midY };
    lastPt  = { x: W - PAD, y: midY };
  } else {
    line = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const p = coords[i - 1], c = coords[i];
      const mx = ((p.x + c.x) / 2).toFixed(1);
      line += ` C ${mx} ${p.y.toFixed(1)}, ${mx} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    }
    firstPt = coords[0];
    lastPt  = coords[coords.length - 1];
  }

  const closeY = fillToTop ? 0 : H;
  const fill = `${line} L ${lastPt.x.toFixed(1)} ${closeY} L ${firstPt.x.toFixed(1)} ${closeY} Z`;

  return { line, fill, lastPt };
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

// ── Reusable mini-chart panel ─────────────────────────────────────────────────
interface PanelProps {
  strokeColor: string;   // e.g. "#10B981"
  fillColor: string;     // e.g. "#10B981"  (gradient base colour)
  fillOpacity: number;   // peak gradient opacity
  gradientId: string;    // must be unique per instance + side
  line: string;
  fill: string;
  lastPt: { x: number; y: number } | null;
  fillToTop: boolean;    // true → SELL (gradient upward), false → BUY (downward)
  label: string;
  isEmpty: boolean;
  rateLabel?: string;
}

function ChartPanel({
  strokeColor, fillColor, fillOpacity, gradientId,
  line, fill, lastPt, fillToTop,
  label, isEmpty, rateLabel,
}: PanelProps) {
  // For BUY (fillToTop=false): gradient starts strong at the line (y1=0 in SVG coords = top of gradient box = where line is)
  //   and fades to transparent at the bottom (y2=1). This creates a downward-flowing fill.
  // For SELL (fillToTop=true): gradient starts strong at y1=1 (bottom of box = the line for SELL)
  //   and fades upward to y2=0 — i.e., fill grows upward toward the center divider.
  const gradientProps = fillToTop
    ? { x1: '0', y1: '1', x2: '0', y2: '0' }
    : { x1: '0', y1: '0', x2: '0', y2: '1' };

  return (
    <div className="relative flex-1 min-h-0">
      <svg
        className="absolute inset-0"
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} {...gradientProps}>
            <stop offset="0%"   stopColor={fillColor} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Subtle grid lines */}
        {[0.33, 0.66].map(f => (
          <line
            key={f}
            x1={0} y1={H * f} x2={W} y2={H * f}
            stroke="white"
            strokeOpacity={isEmpty ? 0.05 : 0.035}
            strokeWidth="1"
            strokeDasharray={isEmpty ? '4 6' : undefined}
          />
        ))}

        {!isEmpty && fill && <path d={fill} fill={`url(#${gradientId})`} />}
        {!isEmpty && line && (
          <path
            d={line}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {!isEmpty && lastPt && (
          <>
            <circle cx={lastPt.x} cy={lastPt.y} r="4.5" fill={strokeColor} fillOpacity="0.18" className="animate-pulse" />
            <circle cx={lastPt.x} cy={lastPt.y} r="2.2" fill={strokeColor} />
          </>
        )}
      </svg>

      {/* Panel label — BUY sits top-left, SELL sits bottom-left */}
      <span
        className={`absolute ${fillToTop ? 'bottom-1.5' : 'top-1.5'} left-2.5 text-[8px] font-mono font-bold tracking-widest pointer-events-none`}
        style={{ color: `${strokeColor}99` }}
      >
        {label}
      </span>

      {/* Rate label — BUY panel top-right */}
      {rateLabel && (
        <span className="absolute top-1.5 right-2.5 text-[8px] font-mono tabular-nums pointer-events-none text-[#00FF85]/45">
          {rateLabel}
        </span>
      )}

      {/* Empty state label */}
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[8px] text-gray-800 font-mono uppercase tracking-widest">
            no {label.toLowerCase()} trades yet
          </span>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TradingJourney({
  orders,
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

  // Each series is plotted with its own independent Y scale
  const buy  = useMemo(() => buildSeriesPaths(buyOrders,  false), [buyOrders]);
  const sell = useMemo(() => buildSeriesPaths(sellOrders, true),  [sellOrders]);

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

        {/* Split chart area — BUY on top, SELL on bottom, no empty space */}
        <div className="flex-1 px-3 sm:px-6 pt-2.5 sm:pt-3 pb-3 sm:pb-5 min-w-0">
          <div
            className="relative rounded-xl bg-[#0A0A0A] border border-white/[0.04] overflow-hidden flex flex-col"
            style={{ height: '136px' }}   /* 67px BUY + 1px divider + 68px SELL */
          >
            {/* ── BUY panel (green, top half) ─────────────────────────────── */}
            <ChartPanel
              strokeColor="#10B981"
              fillColor="#10B981"
              fillOpacity={0.30}
              gradientId={buyGradId}
              line={buy.line}
              fill={buy.fill}
              lastPt={buy.lastPt}
              fillToTop={false}
              label="BUY"
              isEmpty={buyOrders.length === 0}
              rateLabel={`₦${effectiveSellRate.toLocaleString()}`}
            />

            {/* ── Center divider ──────────────────────────────────────────── */}
            <div className="shrink-0 h-px bg-white/[0.08]" />

            {/* ── SELL panel (red, bottom half) ───────────────────────────── */}
            <ChartPanel
              strokeColor="#F43F5E"
              fillColor="#F43F5E"
              fillOpacity={0.28}
              gradientId={sellGradId}
              line={sell.line}
              fill={sell.fill}
              lastPt={sell.lastPt}
              fillToTop={true}
              label="SELL"
              isEmpty={sellOrders.length === 0}
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

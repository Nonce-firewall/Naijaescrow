---
name: TradingJourney seed-curve render gate
description: Why the new-user placeholder S-curve in TradingJourney can silently fail to render even when the seed data is computed correctly.
---

When a chart synthesizes placeholder/seed data for an empty state (e.g. a single seed point so a curve always has something to draw), check every render branch for a *separate* empty-state gate that might still hide it.

In `TradingJourney.tsx`, `buySeriesInput`/`sellSeriesInput` already sub in a synthetic single point (at the current effective rate) whenever there are zero real completed orders, and `buildSeriesPaths` correctly turns that into an S-curve path. But the SVG line/fill/dot render was wrapped in `!buyEmpty`/`!sellEmpty` (computed from the *real* order count, not the seed input) — so the seed curve was fully computed and then thrown away by the render guard. Only the "no trades yet" text showed.

**Why:** two independent pieces of logic (data synthesis vs. render gating) used the same boolean name/intent but weren't kept in sync — the empty check leaked from "should I show empty-state text" into "should I draw anything at all."

**How to apply:** when a component has both a synthesized/fallback data path and an "is this empty" flag, make sure the flag only controls presentation (dimmed/dashed style, hint text) and never gates whether the fallback data's own render path executes. Grep for the empty flag's usages across the whole render body, not just where the text hint lives.

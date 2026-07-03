---
name: Motion animation patterns
description: Conventions and gotchas for motion/react animations in this codebase, including reduced-motion, AnimatePresence key rules, and Vite HMR stale-URL recovery.
---

## Import convention
All animation imports use `motion/react` (not `framer-motion`). Keep them consistent.

## Reduced motion
Wrap the root App return with `<MotionConfig reducedMotion="user">` so all Motion animations automatically respect the OS prefers-reduced-motion setting. Already in place in App.tsx.

## AnimatePresence rules
- Always provide a stable `key` on direct children of AnimatePresence (e.g. `key="landing"`, `key={activeTab}`).
- Use `mode="wait"` for tab/page transitions so exit finishes before enter starts.
- Use `initial={false}` when you don't want animations on first render (tab panels).
- The parent component must remain mounted during exit; conditional rendering goes INSIDE AnimatePresence, not around it.

## Tag hygiene
When converting `<div>` → `<motion.div>`, always update BOTH the opening AND closing tag. Parse errors from mismatched tags cause Vite HMR to serve a broken module; the browser then caches that stale URL and loops with "Invalid hook call" errors even after the file is fixed.

## Recovering from Vite HMR stale-URL loop
Symptom: browser console shows repeated "Failed to fetch dynamically imported module: ...?t=<old-timestamp>" with "Invalid hook call".
Fix: `touch src/main.tsx` to trigger a full-page Vite reload (not just HMR patch), which forces the browser to re-navigate to the fresh entry point.

## Performance
- Animate `opacity` and `transform` (translate/scale) only — these are GPU-composited and don't trigger layout.
- Avoid animating `height: 0 → auto` on hot paths; it causes layout recalculation. Under `reducedMotion="user"` this becomes instant, which mitigates the concern for reduced-motion users.

**Why:** avoid introducing jank on low-end devices common in the Nigerian market this app targets.

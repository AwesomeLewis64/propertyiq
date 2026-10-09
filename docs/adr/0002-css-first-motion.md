# 2. CSS-first motion, no animation library

Status: accepted · 2026-10-08

All motion uses platform features plus what is already bundled:

- Section reveals: one shared IntersectionObserver (`src/ui/reveal.ts`) sets `data-shown` on `[data-reveal]` elements the first time they enter the viewport, and CSS transitions do the fade and rise. Revised during phase B: IntersectionObserver everywhere, instead of scroll-driven animations with an observer fallback, gives "once" semantics, works in every browser and drives the chart draw-in from the same signal. Content is hidden only under `html.js-motion`.
- Scroll-linked chrome (the start-page nav condensing into a pill) does use `animation-timeline: scroll()`; it is decorative, so unsupported browsers keep the full bar.
- Page changes (start → input review → results): View Transitions API (`document.startViewTransition`). Without it, the page swaps instantly.
- Charts: the charts are hand-rolled SVG (`FinancialChart.tsx`; the `recharts` dependency is not used). They draw in with an animated clip rect, not `stroke-dashoffset`, because dashed series carry meaning, and they use CSS transitions on `d` and rect geometry when inputs change.
- Count-up: a small local hook using `requestAnimationFrame`.
- No `motion` or other library. Revisit only if spring or layout animation can't be done in CSS.

`prefers-reduced-motion: reduce` turns off every animation and transition. Count-ups show the final value immediately. The CSP (`script-src 'self'`) is unchanged.

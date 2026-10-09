# 2. CSS-first motion, no animation library

Status: accepted · 2026-10-08

All motion uses platform features plus what is already bundled:

- Section reveals: CSS scroll-driven animations (`animation-timeline: view()`). Where they are unsupported (`@supports not`), one shared IntersectionObserver adds a class that triggers the same fade and slide-up.
- Page changes (start → input review → results): View Transitions API (`document.startViewTransition`). Without it, the page swaps instantly.
- Charts: the charts are hand-rolled SVG (`FinancialChart.tsx`; the `recharts` dependency is not used). They draw in with an animated clip rect, not `stroke-dashoffset`, because dashed series carry meaning, and they use CSS transitions on `d` and rect geometry when inputs change.
- Count-up: a small local hook using `requestAnimationFrame`.
- No `motion` or other library. Revisit only if spring or layout animation can't be done in CSS.

`prefers-reduced-motion: reduce` turns off every animation and transition. Count-ups show the final value immediately. The CSP (`script-src 'self'`) is unchanged.

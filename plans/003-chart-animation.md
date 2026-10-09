# Plan 003: Charts draw in and transition smoothly

Planned at `3613ea0` · Priority P2 · Effort M · Risk MED · Depends on: 001, 002 (step 4 uses `useCountUp`)

## Current state
- `src/ui/FinancialChart.tsx` renders hand-rolled SVG; Recharts is not used.
- Line charts have one `<path>` per series (around lines 402-420). Series 2–4 are dashed with `strokeDasharray` so they can be told apart without color; keep that.
- Bar and bridge charts use `<rect>` elements (around lines 355-370).
- Export (around lines 125-180) clones the live SVG and resolves `var()` from the current theme.

## Steps
1. **Draw-in.** Lines: wrap the plot in `<g clipPath="url(#{id}-reveal)">`. Give the `<clipPath>` rect its full `width` as an attribute, so exported charts are complete, and animate it with CSS `scaleX(0 → 1)` (`transform-box: fill-box; transform-origin: left`, 900ms). Bars: a `.chart-bar` grow animation, staggered with `animation-delay: calc(var(--i) * 40ms)` and `--i` set in the style prop.
2. **Smooth changes when inputs change.** Line paths: CSS `transition: d 300ms`. Chromium and Firefox animate this; Safari snaps to the new shape, which is acceptable. Rects: transition the CSS geometry properties `x`, `width`, `y`, `height`. Keep the existing stable `key`s (series name and row label).
3. **Export.** Remove animation attributes from the clone. Always export with light colors by adding `--export-*` tokens set to the light values. This keeps `e2e/design-system.spec.ts:101` (`#10264d`) passing in dark mode.
4. **Exit bridge.** The bridge numbers in `Charts.tsx` (`.bridge strong`) use `useCountUp` from plan 002.

## Files
`src/ui/FinancialChart.tsx`, `src/ui/Charts.tsx`, `src/ui/VisualAdditions.tsx` (same treatment if it renders SVG bars), `src/styles.css`, `src/design-system.css`.

## STOP if
The `d` transition visibly mis-morphs when the number of points changes (for example a different hold length). In that case drop the transition for that case by keying the path on `rows.length`.

## Done
The gate passes. An SVG exported in dark mode contains `#10264d` and no `var(` or `animation`.

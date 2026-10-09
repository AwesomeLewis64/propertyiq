# Plan 004: Shine sweep and success sparkle

Planned at `3613ea0` · Priority P3 · Effort S · Risk LOW · Depends on: 001, 002

## Design (ADR-0006)
- **Pastel tokens**: `--accent-pink`, `--accent-violet` and `--accent-cyan`, with light and dark values. Used only here.
- **Shine**: an `.iq-analyze::after` diagonal pastel gradient.
  - Sweeps across (`translateX(-120% → 120%)`) on `:hover` and `:focus-visible` over 700ms.
  - `pointer-events: none`, clipped by `overflow: hidden`.
  - Must not reduce the label's contrast: shine opacity at most 0.35, layered under the text.
- **Sparkle**: `src/ui/Sparkle.tsx` (new), eight absolutely positioned `aria-hidden` spans with CSS keyframes, removed on `animationend`.
  - Rendered next to the KPI row once per new analysis, when results first appear with `m.errors.length === 0`.
  - Mechanism: set a `celebrate` flag when `onAnnual` is called or "Create analysis" is submitted, and clear it after the sparkle fires.
  - Never fires on validation errors or input edits.
- **Reduced motion**: neither renders. The global CSS block from plan 001 covers the CSS, and Sparkle also checks `matchMedia` and returns null.

## Files
`src/design-system.css`, `src/styles.css`, `src/ui/Sparkle.tsx` (new), `src/App.tsx` (flag and render), `src/ui/StartPage.tsx` (class only, if needed).

## Done
The gate passes. With reduced motion there are no sparkle nodes, and with motion they are gone within 2s.

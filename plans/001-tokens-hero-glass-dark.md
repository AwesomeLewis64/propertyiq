# Plan 001: Apple-style tokens, hero, glass nav and dark mode

Planned at `3613ea0` · Priority P1 · Effort L · Risk MED · Depends on: none

## Why
ADR-0001 replaces the navy/Georgia system, and every later phase builds on these tokens. `styles.css` has no hard-coded colors, so dark mode (ADR-0004) is a token override.

## Files
- `src/design-system.css`: new and changed tokens. Radii: `--radius-control` 10px, `--radius-panel` 20px, new `--radius-hero` 28px. Layered shadows: `--shadow-card`, new `--shadow-raised`, `--shadow-overlay`. `--font-display` becomes the system sans stack. Fluid hero sizes via `clamp()`. Also `--gradient-key` (blue to indigo), `--glass-bg`/`--glass-border`, `--ease-spring` (a CSS `linear()` spring) and motion durations. Add `color-scheme: light dark` and a `@media (prefers-color-scheme: dark)` block that redefines every color token.
- `src/styles.css`:
  - Hero key phrase: gradient via `background-clip: text`, with a solid-color fallback. Check contrast against the solid fallback color.
  - Hero glow: a pseudo-element that animates only `transform`/`opacity`, on a loop of 20s or longer.
  - Glass headers (`.iq-start-header`, `.topbar`): sticky with `backdrop-filter`, plus an opaque fallback under `@supports not`.
  - Card hover: lift (`translateY(-2px)` plus a larger shadow) with spring easing; no tilt on `(hover: none)` devices.
  - Reduced motion: replace the two existing blocks with one global block at the end of the file: `*, ::before, ::after { animation: none !important; transition: none !important; }`.
- `src/ui/StartPage.tsx`: wrap the key phrase in `<span className="iq-key">`. No logic changes.
- `index.html`: two theme-color metas, one per color scheme, using `media`.
- `src/ui/Brand.tsx`: change only if the logo fails contrast in dark mode (check first).
- `DESIGN_SYSTEM.md`: rewrite to match. `DESIGN.md`/`PRODUCT.md` (from impeccable init) point here and do not duplicate it.
- `e2e/design-system.spec.ts:108-118,146-150`: replace the literal `12px` and white checks with "matches the token". Read `--radius-panel` and `--color-surface` via getComputedStyle and compare. For the header, assert glass: a `backdrop-filter` other than `none`, or the opaque fallback.
- `e2e/propertyiq.spec.ts:242`: run the axe + overflow loop a second time with `page.emulateMedia({ colorScheme: "dark" })`.

## Out of scope
`src/finance/**`, the component code in `src/advanced/**` (the planner only inherits tokens), and chart export (plan 003).

## STOP if
- axe reports a color-contrast violation that can't be fixed with a token change while staying at AA or better.
- The dark-mode logo needs a new asset.

## Done
The gate passes. Screenshots of `/` and `/#quick/overview` at 1440 and 390, in light and dark.

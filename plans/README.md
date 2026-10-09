# PropertyIQ redesign plans

Planned at commit `3613ea0`, 2026-10-08. Decisions: `docs/adr/0001-0006`, vocabulary: `CONTEXT.md`.
Executed in order, one phase at a time, on branch `redesign/apple-motion`. Each phase ends with the full gate (below), impeccable critique/audit, and screenshots (desktop + 390px, light + dark).

Gate (every phase): `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm exec playwright test --project=desktop --project=mobile`

| # | Plan | Depends on | Effort | Risk | Status |
|---|------|-----------|--------|------|--------|
| 001 | [Tokens, hero, glass, dark mode](001-tokens-hero-glass-dark.md) | none | L | MED | TODO |
| 002 | [Reveals, story card, count-up, crossfades](002-reveals-story-countup-crossfade.md) | 001 | L | HIGH | TODO |
| 003 | [Chart draw-in and value transitions](003-chart-animation.md) | 001, 002 | M | MED | TODO |
| 004 | [Anime accents: shine + sparkle](004-anime-accents.md) | 001, 002 | S | LOW | TODO |

## Audit findings that shape the plans

| # | Finding | Category | Impact | Evidence |
|---|---------|----------|--------|----------|
| 1 | Charts are hand-rolled SVG, not Recharts. `recharts` is in package.json but nothing imports it, so the SVG is animated with CSS. (ADR-0002 originally said "use Recharts animation"; it has been corrected.) | tech-debt | HIGH (shapes plan 003) | `src/ui/FinancialChart.tsx:331-425`; no `from "recharts"` in `src` |
| 2 | Line series 2–4 use `strokeDasharray` so they can be told apart without color. A `stroke-dashoffset` draw-in would break those dashes, so reveal with an animated clip rect instead. | a11y | HIGH | `FinancialChart.tsx:402-420` |
| 3 | Chart export clones the live SVG and resolves tokens from the current theme, so dark mode would export dark charts. The e2e test expects `#10264d` in the export. | correctness | MED | `FinancialChart.tsx:131-150`; `e2e/design-system.spec.ts:101` |
| 4 | Axe runs only in light mode and only once after load. Reveals that leave content at partial opacity can produce color-contrast violations. Dark mode has no axe coverage at all. | tests/a11y | HIGH | `e2e/propertyiq.spec.ts:242-300` |
| 5 | e2e checks lock values that ADR-0001 retires: white `.iq-start-header` (glass breaks this), composer radius `12px`, `.adv-card` radius `12px`. | tests | MED | `e2e/design-system.spec.ts:108-118, 146-150` |
| 6 | Every color in `styles.css` is a token (no hex literals), so dark mode is mostly a token override. Exceptions: the `index.html` theme-color `#142c43` and the Brand logo color matrix. | good news | n/a | `index.html:6`; `src/ui/Brand.tsx:13-37` |
| 7 | Reduced-motion rules are split across two blocks and won't cover new animations automatically. | a11y | MED | `styles.css:3576`, `styles.css:4996` |
| 8 | `Metrics` formats values to strings before rendering, so count-up needs the raw numbers plus a formatter. Some values are `null` and show "N/A"; those must not animate. | correctness | MED | `src/App.tsx:43-100` |

Considered and rejected: adding `motion` (ADR-0002); removing the unused `recharts` dependency (out of scope; it isn't bundled because nothing imports it).
